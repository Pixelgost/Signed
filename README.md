### Run Frontend
1. Navigate to `Signed-Frontend`
2. Create a `.env` file in the root of `Signed-Frontend` with the following variable(s):
> MACHINE_IP=""
> ⚠️ Make sure the URL matches your backend server (for mobile testing, replace `localhost` with your machine's IP address).
3. Run `npm i`
4. Run `npx expo start`
> Run `npx expo start -c` to clear cache from config files

### Run Backend
1. Run `pip install -r requirements.txt`
> If new modules/packages are imported, run `pip freeze > requirements.txt` to update file
2. Run `python manage.py runserver 0.0.0.0:8000` in `Signed-Backend/SignedBackend`

### Test Backend
1. Run `pytest -q` in `Signed-Backend/SignedBackend`

### Scripts

To run the scripts, first start the Django backend.

Then, open another terminal and cd into `Signed-Backend/SignedBackend`. (You will need your venv activated)

For populating the database, run `python -m accounts.scripts.populate_database`
This creates sample employer and employee accounts, and some sample job postings

For deleting accounts, run `python -m accounts.scripts.delete_users`
Note that by default, this will delete all users. Add emails to the DELETE list to delete only those accounts, or add emails to the WHITELIST list to delete all accounts except those accounts