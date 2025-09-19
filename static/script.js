let myMacroChart = null;
let myBmiChart = null;
let isImperial = false;

function openTab(evt, tabName) {
    let i, tabcontent, tabbuttons;
    tabcontent = document.getElementsByClassName("tab-content");
    for (i = 0; i < tabcontent.length; i++) {
        tabcontent[i].style.display = "none";
    }
    tabbuttons = document.getElementsByClassName("tab-button");
    for (i = 0; i < tabbuttons.length; i++) {
        tabbuttons[i].className = tabbuttons[i].className.replace(" active", "");
    }
    document.getElementById(tabName).style.display = "block";
    evt.currentTarget.className += " active";

    // Load saved user data when a tab is opened
    const savedWeight = localStorage.getItem('userWeight');
    const savedHeight = localStorage.getItem('userHeight');
    const savedAge = localStorage.getItem('userAge');
    const savedGender = localStorage.getItem('userGender');

    if (savedAge && tabName === 'calorie') { document.getElementById('age').value = savedAge; }
    if (savedGender && tabName === 'calorie') { document.getElementById('gender').value = savedGender; }
    if (savedWeight) { document.getElementById('weight').value = savedWeight; document.getElementById('bmi-weight').value = savedWeight; document.getElementById('burned-weight').value = savedWeight; }
    if (savedHeight) { document.getElementById('height').value = savedHeight; document.getElementById('bmi-height').value = savedHeight; }
    // Check if the macro tab is opened and a TDEE value exists
    if (tabName === 'macro') {
        const tdee = localStorage.getItem('tdeeValue');
        if (tdee) {
            document.getElementById('tdee-input').value = tdee;
            document.getElementById('tdee-input').placeholder = ''; // Clear placeholder if value is set
        }
        // Initial update for sliders when tab is opened
        updateMacroRatios(null);
    }
}

document.addEventListener('DOMContentLoaded', (event) => {
    document.querySelector('.tab-button').click();

    document.getElementById('metric-btn').addEventListener('click', () => {
        isImperial = false;
        document.getElementById('metric-btn').classList.add('active');
        document.getElementById('imperial-btn').classList.remove('active');
        document.getElementById('weight').labels[0].textContent = 'Weight (kg)';
        document.getElementById('height').labels[0].textContent = 'Height (cm)';
        document.getElementById('bmi-weight').labels[0].textContent = 'Weight (kg)';
        document.getElementById('bmi-height').labels[0].textContent = 'Height (cm)';
        document.getElementById('burned-weight').labels[0].textContent = 'Weight (kg)';
    });

    document.getElementById('imperial-btn').addEventListener('click', () => {
        isImperial = true;
        document.getElementById('imperial-btn').classList.add('active');
        document.getElementById('metric-btn').classList.remove('active');
        document.getElementById('weight').labels[0].textContent = 'Weight (lbs)';
        document.getElementById('height').labels[0].textContent = 'Height (in)';
        document.getElementById('bmi-weight').labels[0].textContent = 'Weight (lbs)';
        document.getElementById('bmi-height').labels[0].textContent = 'Height (in)';
        document.getElementById('burned-weight').labels[0].textContent = 'Weight (lbs)';
    });
});

// A general function to handle fetch errors
function handleFetchResponse(response) {
    if (response.status === 401) {
        throw new Error("You must be logged in to use this feature.");
    }
    return response.json();
}

// A general function for client-side validation
function validateForm(formId) {
    const form = document.getElementById(formId);
    const inputs = form.querySelectorAll('input[required], select[required]');
    for (const input of inputs) {
        if (!input.value || (input.type === 'number' && parseFloat(input.value) <= 0)) {
            return false;
        }
    }
    return true;
}

// Function to update macro ratios and ensure they total 100%
function updateMacroRatios(changedSlider) {
    const proteinSlider = document.getElementById('protein-ratio');
    const carbSlider = document.getElementById('carb-ratio');
    const fatSlider = document.getElementById('fat-ratio');

    let protein = parseInt(proteinSlider.value);
    let carb = parseInt(carbSlider.value);
    let fat = parseInt(fatSlider.value);

    // Get a live reference to the spans to update them
    document.getElementById('protein-value').textContent = protein + '%';
    document.getElementById('carb-value').textContent = carb + '%';
    document.getElementById('fat-value').textContent = fat + '%';

    const total = protein + carb + fat;

    if (changedSlider) {
        if (total !== 100) {
            const diff = total - 100;
            if (changedSlider.id === 'protein-ratio') {
                const availableForOthers = 100 - protein;
                if (carb + fat !== 0) {
                    const carbProp = carb / (carb + fat);
                    const fatProp = fat / (carb + fat);
                    carb = Math.round(availableForOthers * carbProp);
                    fat = Math.round(availableForOthers * fatProp);
                } else {
                    carb = Math.floor(availableForOthers / 2);
                    fat = availableForOthers - carb;
                }
            } else if (changedSlider.id === 'carb-ratio') {
                const availableForOthers = 100 - carb;
                if (protein + fat !== 0) {
                    const proteinProp = protein / (protein + fat);
                    const fatProp = fat / (protein + fat);
                    protein = Math.round(availableForOthers * proteinProp);
                    fat = Math.round(availableForOthers * fatProp);
                } else {
                    protein = Math.floor(availableForOthers / 2);
                    fat = availableForOthers - protein;
                }
            } else if (changedSlider.id === 'fat-ratio') {
                const availableForOthers = 100 - fat;
                if (protein + carb !== 0) {
                    const proteinProp = protein / (protein + carb);
                    const carbProp = carb / (protein + carb);
                    protein = Math.round(availableForOthers * proteinProp);
                    carb = Math.round(availableForOthers * carbProp);
                } else {
                    protein = Math.floor(availableForOthers / 2);
                    carb = availableForOthers - protein;
                }
            }
        }
    } else {
        // Initial load logic to ensure 100%
        const total = protein + carb + fat;
        if (total !== 100) {
            const diff = total - 100;
            // A simple adjustment, can be more complex
            if (diff > 0) {
                if (fat > 10) fat -= diff;
                else if (carb > 10) carb -= diff;
                else protein -= diff;
            } else if (diff < 0) {
                if (fat < 60) fat -= diff;
                else if (carb < 60) carb -= diff;
                else protein -= diff;
            }
        }
    }

    // Set the corrected values
    proteinSlider.value = protein;
    carbSlider.value = carb;
    fatSlider.value = fat;
    document.getElementById('protein-value').textContent = protein + '%';
    document.getElementById('carb-value').textContent = carb + '%';
    document.getElementById('fat-value').textContent = fat + '%';
}

// Calorie calculator logic (Modified to use handleFetchResponse)
document.getElementById('calorie-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm('calorie-form')) return;

    const loadingDiv = document.getElementById('calorie-loading');
    loadingDiv.style.display = 'block';
    const resultDiv = document.getElementById('calorie-result');
    resultDiv.innerHTML = '';

    const age = document.getElementById('age').value;
    const gender = document.getElementById('gender').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const activity = document.getElementById('activity').value;

    fetch('/calculate-calories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age, gender, weight, height, activity })
    })
    .then(handleFetchResponse)
    .then(data => {
        loadingDiv.style.display = 'none';
        if (data.error) { resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`; return; }

        let feedback = '';
        const tdee = Math.round(data.tdee);
        if (tdee < 1500) { feedback = "Your calorie needs are quite low. Ensure you're eating a balanced diet to meet your nutritional needs."; }
        else if (tdee > 2500) { feedback = "Your daily calorie needs are high. This is common for very active individuals. Remember to fuel your body properly!"; }

        resultDiv.innerHTML = `<p>Your estimated daily calorie needs (TDEE) are:</p><p class="tdee-value">${tdee} kcal</p><p class="feedback-text">${feedback}</p>`;

        // Save the TDEE value and user inputs to localStorage for persistence
        localStorage.setItem('tdeeValue', tdee);
        localStorage.setItem('userAge', age);
        localStorage.setItem('userGender', gender);
        localStorage.setItem('userWeight', weight);
        localStorage.setItem('userHeight', height);

    })
    .catch(error => {
        loadingDiv.style.display = 'none';
        console.error('Error:', error);
        resultDiv.innerHTML = `<div class="error-message"><p><strong>Error:</strong> ${error.message}</p></div>`;
    });
});

// BMI calculator logic (Modified to use handleFetchResponse)
document.getElementById('bmi-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm('bmi-form')) return;

    const loadingDiv = document.getElementById('bmi-loading');
    loadingDiv.style.display = 'block';
    const resultDiv = document.getElementById('bmi-result');
    resultDiv.innerHTML = '';

    const weight = document.getElementById('bmi-weight').value;
    const height = document.getElementById('bmi-height').value;
    fetch('/calculate-bmi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, height })
    })
    .then(handleFetchResponse)
    .then(data => {
        loadingDiv.style.display = 'none';
        if (data.error) { resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`; return; }

        let categoryClass = '';
        let advice = '';

        if (data.category === 'Underweight') { categoryClass = 'underweight'; advice = 'Consider consulting a professional to develop a healthy weight gain plan.'; }
        else if (data.category === 'Normal weight') { categoryClass = 'normal-weight'; advice = 'Great job! Maintain your healthy habits for long-term well-being.'; }
        else if (data.category === 'Overweight') { categoryClass = 'overweight'; advice = 'Small changes to diet and exercise can make a big difference. Focus on consistency!'; }
        else { categoryClass = 'obese'; advice = 'It may be beneficial to speak with a healthcare provider about a weight management plan.'; }

        resultDiv.innerHTML = `<p>Your BMI is:</p><p class="tdee-value">${data.bmi}</p><p class="bmi-category ${categoryClass}">${data.category}</p><p class="feedback-text">${advice}</p>`;
        
        // Destroy the old chart if it exists
        if (myBmiChart) {
            myBmiChart.destroy();
        }

        const ctx = document.getElementById('bmiChart').getContext('2d');
        myBmiChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Underweight', 'Normal', 'Overweight', 'Obese', 'Your BMI'],
                datasets: [{
                    label: 'BMI Category',
                    data: [18.5, 24.9, 29.9, 50, data.bmi],
                    backgroundColor: [ 'rgba(54, 162, 235, 0.5)', 'rgba(75, 192, 192, 0.5)', 'rgba(255, 206, 86, 0.5)', 'rgba(255, 99, 132, 0.5)', 'rgba(0, 123, 255, 1)' ],
                    borderColor: [ 'rgba(54, 162, 235, 1)', 'rgba(75, 192, 192, 1)', 'rgba(255, 206, 86, 1)', 'rgba(255, 99, 132, 1)', 'rgba(0, 123, 255, 1)' ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                scales: { y: { beginAtZero: true } },
                plugins: { legend: { display: false }, title: { display: true, text: 'BMI Comparison' } }
            }
        });
    })
    .catch(error => {
        loadingDiv.style.display = 'none';
        console.error('Error:', error);
        resultDiv.innerHTML = `<div class="error-message"><p><strong>Error:</strong> ${error.message}</p></div>`;
    });
});

// Calories Burned calculator logic (updated with separate fields)
document.getElementById('burned-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm('burned-form')) return;

    const loadingDiv = document.getElementById('burned-loading');
    loadingDiv.style.display = 'block';
    const resultDiv = document.getElementById('burned-result');
    resultDiv.innerHTML = '';

    const weight = document.getElementById('burned-weight').value;
    const activity = document.getElementById('burned-activity-select').value;
    const duration = document.getElementById('burned-duration').value;
    
    fetch('/calculate-calories-burned', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, activity, duration })
    })
    .then(handleFetchResponse)
    .then(data => {
        loadingDiv.style.display = 'none';
        if (data.error) { resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`; return; }
        resultDiv.innerHTML = `<p>You burned an estimated:</p><p class="tdee-value">${data.calories_burned} kcal</p>`;
    })
    .catch(error => {
        loadingDiv.style.display = 'none';
        console.error('Error:', error);
        resultDiv.innerHTML = `<div class="error-message"><p><strong>Error:</strong> ${error.message}</p></div>`;
    });
});

// Macro calculator logic (Modified to get values from sliders and use chart.js)
document.getElementById('macro-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if (!validateForm('macro-form')) return;

    const tdee = parseFloat(document.getElementById('tdee-input').value);
    const proteinRatio = parseFloat(document.getElementById('protein-ratio').value);
    const carbRatio = parseFloat(document.getElementById('carb-ratio').value);
    const fatRatio = parseFloat(document.getElementById('fat-ratio').value);
    const totalRatio = proteinRatio + carbRatio + fatRatio;
    const resultDiv = document.getElementById('macro-result');

    // The updateMacroRatios function handles the total, so this check is mostly for sanity
    if (Math.abs(totalRatio - 100) > 0.1) {
        resultDiv.innerHTML = `<div class="error-message"><p><strong>Error:</strong> Ratios must total 100% (currently ${totalRatio.toFixed(1)}%)</p></div>`;
        return;
    }
    
    fetch('/calculate-macros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tdee, proteinRatio, carbRatio, fatRatio })
    })
    .then(handleFetchResponse)
    .then(data => {
        if (data.error) { resultDiv.innerHTML = `<p style="color: red;">${data.error}</p>`; return; }
        resultDiv.innerHTML = `
            <h3>Your Daily Macronutrient Goals:</h3>
            <p><strong>Protein:</strong> ${data.protein_grams}g</p>
            <p><strong>Carbohydrates:</strong> ${data.carb_grams}g</p>
            <p><strong>Fats:</strong> ${data.fat_grams}g</p>
        `;

        // Check if a chart instance already exists and destroy it
        if (myMacroChart) {
            myMacroChart.destroy();
        }

        const ctx = document.getElementById('macroChart').getContext('2d');
        myMacroChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: ['Protein', 'Carbohydrates', 'Fats'],
                datasets: [{
                    label: 'Macronutrient Breakdown',
                    data: [proteinRatio, carbRatio, fatRatio],
                    backgroundColor: [
                        'rgba(255, 99, 132, 0.8)',
                        'rgba(54, 162, 235, 0.8)',
                        'rgba(255, 206, 86, 0.8)'
                    ],
                    borderColor: [
                        'rgba(255, 99, 132, 1)',
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 206, 86, 1)'
                    ],
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: true,
                        text: 'Macro Ratios (%)'
                    }
                }
            }
        });
    })
    .catch(error => {
        console.error('Error:', error);
        resultDiv.innerHTML = `<div class="error-message"><p><strong>Error:</strong> ${error.message}</p></div>`;
    });
});