How to run expfront (frontend):

npm install framer-motion 
npm install three 
npm run dev

How to run exoback (backend):
In a folder with exoback write (only for windows):
python -m venv .venv
.venv/Scripts/activate

Then install all required libraries:

pip install Django==5.2.6
pip install djangorestframework
pip install djangorestframework-simplejwt
pip install numpy
pip install pandas
pip install shap
pip install xgboost
pip install joblib
pip install django-cors-headers

To start server:
py manage.py runserver

If required you may need to change CORS_ALLOWED_ORIGINS in exoback/exoback/setting.py, line 147.
