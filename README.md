### Run Frontend
1. Navigate to `Signed-Frontend`
2. Create a `.env` file in the root of `Signed-Frontend` with the following variable(s):
> MACHINE_IP=""
> ⚠️ Make sure the URL matches your backend server (for mobile testing, replace `localhost` with your machine's IP address).
3. Run `npx expo start`

### Run Backend
run `python manage.py runserver 0.0.0.0:8000` in `Signed-Backend/SignedBackend`
