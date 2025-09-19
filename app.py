from flask import Flask, render_template, request, jsonify, redirect, url_for, flash
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin, login_user, LoginManager, login_required, logout_user, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField
from wtforms.validators import InputRequired, Length, ValidationError
from flask_migrate import Migrate
from datetime import datetime
from sqlalchemy import func
from werkzeug.utils import secure_filename
import os

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = 'thisisasecretkey'
app.config['UPLOAD_FOLDER'] = 'static/profile_pics'
db = SQLAlchemy(app)
migrate = Migrate(app, db)

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

class User(db.Model, UserMixin):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), nullable=False, unique=True)
    password = db.Column(db.String(80), nullable=False)
    profile_pic = db.Column(db.String(255), nullable=True, default='default.jpg')
    bio = db.Column(db.Text, nullable=True)
    health_data = db.relationship('UserHealthData', backref='owner', lazy=True)
    food_entries = db.relationship('FoodEntry', backref='owner', lazy=True)
    exercise_entries = db.relationship('ExerciseEntry', backref='owner', lazy=True)
    weight_logs = db.relationship('WeightLog', backref='owner', lazy=True)

class UserHealthData(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    tdee = db.Column(db.Float, nullable=True)
    bmi = db.Column(db.Float, nullable=True)
    calories_burned = db.Column(db.Float, nullable=True)
    protein_grams = db.Column(db.Float, nullable=True)
    carb_grams = db.Column(db.Float, nullable=True)
    fat_grams = db.Column(db.Float, nullable=True)
    date_created = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class FoodEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    food_name = db.Column(db.String(100), nullable=False)
    calories = db.Column(db.Integer, nullable=False)
    protein = db.Column(db.Float, nullable=True)
    carbs = db.Column(db.Float, nullable=True)
    fats = db.Column(db.Float, nullable=True)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class ExerciseEntry(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    exercise_name = db.Column(db.String(100), nullable=False)
    duration_minutes = db.Column(db.Integer, nullable=True)
    calories_burned = db.Column(db.Integer, nullable=False)
    date_created = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class WeightLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    weight = db.Column(db.Float, nullable=False)
    date_logged = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)

class RegisterForm(FlaskForm):
    username = StringField(validators=[InputRequired(), Length(min=4, max=20)], render_kw={"placeholder": "Username"})
    password = PasswordField(validators=[InputRequired(), Length(min=8, max=80)], render_kw={"placeholder": "Password"})
    submit = SubmitField('Register')

    def validate_username(self, username):
        existing_user_username = User.query.filter_by(username=username.data).first()
        if existing_user_username:
            raise ValidationError('That username already exists. Please choose a different one.')

class LoginForm(FlaskForm):
    username = StringField(validators=[InputRequired(), Length(min=4, max=20)], render_kw={"placeholder": "Username"})
    password = PasswordField(validators=[InputRequired(), Length(min=8, max=80)], render_kw={"placeholder": "Password"})
    submit = SubmitField('Login')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user:
            if user.password == form.password.data:
                login_user(user)
                flash('Login successful!', 'success')
                return redirect(url_for('home'))
            else:
                flash('Invalid username or password.', 'danger')
        else:
            flash('Invalid username or password.', 'danger')
    return render_template('login.html', form=form)

@app.route('/register', methods=['GET', 'POST'])
def register():
    form = RegisterForm()
    if form.validate_on_submit():
        new_user = User(username=form.username.data, password=form.password.data)
        db.session.add(new_user)
        db.session.commit()
        flash('Registration successful! You can now log in.', 'success')
        return redirect(url_for('login'))
    return render_template('register.html', form=form)

@app.route('/home')
@login_required
def home():
    return render_template('index.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/profile')
@login_required
def profile():
    health_data_history = UserHealthData.query.filter_by(user_id=current_user.id).order_by(UserHealthData.date_created.desc()).all()
    return render_template('profile.html', user=current_user, history=health_data_history)

@app.route('/calculate-calories', methods=['POST'])
@login_required
def calculate_calories():
    data = request.json
    try:
        age = int(data['age'])
        gender = data['gender']
        weight_kg = float(data['weight'])
        height_cm = float(data['height'])
        activity_level = float(data['activity'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input data'}), 400

    if gender == 'male':
        bmr = 88.362 + (13.397 * weight_kg) + (4.799 * height_cm) - (5.677 * age)
    else:
        bmr = 447.593 + (9.247 * weight_kg) + (3.098 * height_cm) - (4.330 * age)
    tdee = bmr * activity_level
    
    user_data = UserHealthData(tdee=round(tdee, 2), owner=current_user)
    db.session.add(user_data)
    db.session.commit()
    
    return jsonify({
        'tdee': round(tdee, 2),
        'gender': gender,
        'age': age,
        'weight': weight_kg,
        'height': height_cm
    })

@app.route('/calculate-bmi', methods=['POST'])
@login_required
def calculate_bmi():
    data = request.json
    try:
        weight_kg = float(data['weight'])
        height_cm = float(data['height'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input data'}), 400

    height_m = height_cm / 100
    if height_m <= 0: return jsonify({'error': 'Height cannot be zero or negative'}), 400
    bmi = weight_kg / (height_m ** 2)
    
    user_data = UserHealthData(bmi=round(bmi, 2), owner=current_user)
    db.session.add(user_data)
    db.session.commit()
    
    category = "Unknown"
    if bmi < 18.5: category = "Underweight"
    elif 18.5 <= bmi < 24.9: category = "Normal weight"
    elif 25 <= bmi < 29.9: category = "Overweight"
    else: category = "Obese"
    return jsonify({'bmi': round(bmi, 2), 'category': category})

@app.route('/calculate-calories-burned', methods=['POST'])
@login_required
def calculate_calories_burned():
    data = request.json
    try:
        weight_kg = float(data['weight'])
        met_value = float(data['activity'])
        duration_minutes = float(data['duration'])
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input data'}), 400

    calories_burned = (met_value * 3.5 * weight_kg) / 200 * duration_minutes
    
    user_data = UserHealthData(calories_burned=round(calories_burned, 2), owner=current_user)
    db.session.add(user_data)
    db.session.commit()
    
    return jsonify({'calories_burned': round(calories_burned, 2)})

@app.route('/calculate-macros', methods=['POST'])
@login_required
def calculate_macros():
    data = request.json
    try:
        tdee = float(data['tdee'])
        protein_ratio = float(data['proteinRatio'])
        carb_ratio = float(data['carbRatio'])
        fat_ratio = float(data['fatRatio'])
        if round(protein_ratio + carb_ratio + fat_ratio) != 100:
            return jsonify({'error': 'Ratios must total 100%'}), 400
    except (KeyError, ValueError):
        return jsonify({'error': 'Invalid input data'}), 400

    protein_calories = tdee * (protein_ratio / 100)
    carb_calories = tdee * (carb_ratio / 100)
    fat_calories = tdee * (fat_ratio / 100)
    
    protein_grams = protein_calories / 4
    carb_grams = carb_calories / 4
    fat_grams = fat_calories / 9
    
    user_data = UserHealthData(
        protein_grams=round(protein_grams, 1),
        carb_grams=round(carb_grams, 1),
        fat_grams=round(fat_grams, 1),
        owner=current_user
    )
    db.session.add(user_data)
    db.session.commit()

    return jsonify({
        'protein_grams': round(protein_grams, 1),
        'carb_grams': round(carb_grams, 1),
        'fat_grams': round(fat_grams, 1)
    })

@app.route('/food_log', methods=['GET', 'POST'])
@login_required
def food_log():
    if request.method == 'POST':
        food_name = request.form.get('food_name')
        calories = request.form.get('calories')
        protein = request.form.get('protein')
        carbs = request.form.get('carbs')
        fats = request.form.get('fats')

        if not food_name or not calories:
            flash('Food name and calories are required!', 'danger')
            return redirect(url_for('food_log'))

        new_entry = FoodEntry(
            food_name=food_name,
            calories=calories,
            protein=protein,
            carbs=carbs,
            fats=fats,
            user_id=current_user.id
        )
        db.session.add(new_entry)
        db.session.commit()
        flash('Food entry added successfully!', 'success')
        return redirect(url_for('food_log'))

    today = datetime.utcnow().date()
    today_entries = FoodEntry.query.filter(
        FoodEntry.user_id == current_user.id,
        func.date(FoodEntry.date_created) == today
    ).order_by(FoodEntry.date_created.desc()).all()

    total_calories = sum(entry.calories for entry in today_entries)
    total_protein = sum(entry.protein or 0 for entry in today_entries)
    total_carbs = sum(entry.carbs or 0 for entry in today_entries)
    total_fats = sum(entry.fats or 0 for entry in today_entries)

    return render_template(
        'food_log.html',
        entries=today_entries,
        total_calories=total_calories,
        total_protein=total_protein,
        total_carbs=total_carbs,
        total_fats=total_fats
    )

@app.route('/exercise_log', methods=['GET', 'POST'])
@login_required
def exercise_log():
    if request.method == 'POST':
        exercise_name = request.form.get('exercise_name')
        duration = request.form.get('duration')
        calories_burned = request.form.get('calories_burned')
        
        if not exercise_name or not calories_burned:
            flash('Exercise name and calories are required!', 'danger')
            return redirect(url_for('exercise_log'))

        new_entry = ExerciseEntry(
            exercise_name=exercise_name,
            duration_minutes=duration,
            calories_burned=calories_burned,
            user_id=current_user.id
        )
        db.session.add(new_entry)
        db.session.commit()
        flash('Exercise entry added successfully!', 'success')
        return redirect(url_for('exercise_log'))

    today = datetime.utcnow().date()
    today_entries = ExerciseEntry.query.filter(
        ExerciseEntry.user_id == current_user.id,
        func.date(ExerciseEntry.date_created) == today
    ).order_by(ExerciseEntry.date_created.desc()).all()

    total_calories_burned = sum(entry.calories_burned for entry in today_entries)

    return render_template(
        'exercise_log.html',
        entries=today_entries,
        total_calories_burned=total_calories_burned
    )

@app.route('/weight_tracker', methods=['GET', 'POST'])
@login_required
def weight_tracker():
    if request.method == 'POST':
        weight = request.form.get('weight')
        if weight:
            new_log = WeightLog(weight=float(weight), user_id=current_user.id)
            db.session.add(new_log)
            db.session.commit()
            flash('Weight logged successfully!', 'success')
        return redirect(url_for('weight_tracker'))

    weight_history = WeightLog.query.filter_by(user_id=current_user.id).order_by(WeightLog.date_logged).all()
    
    dates = [log.date_logged.strftime('%Y-%m-%d') for log in weight_history]
    weights = [log.weight for log in weight_history]
    
    return render_template('weight_tracker.html', dates=dates, weights=weights)


@app.route('/edit_profile', methods=['GET', 'POST'])
@login_required
def edit_profile():
    if request.method == 'POST':
        current_user.bio = request.form.get('bio')
        
        if 'profile_pic' in request.files:
            file = request.files['profile_pic']
            if file.filename != '':
                filename = secure_filename(file.filename)
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
                file.save(file_path)
                current_user.profile_pic = filename
        
        db.session.commit()
        flash('Profile updated successfully!', 'success')
        return redirect(url_for('profile'))

    return render_template('edit_profile.html')

if __name__ == '__main__':
    if not os.path.exists('static/profile_pics'):
        os.makedirs('static/profile_pics')
    with app.app_context():
        pass
    app.run(debug=True)