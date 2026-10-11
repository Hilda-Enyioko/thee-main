# TheeInsurance

TheeInsurance is maintained as a monorepo containing two independently runnable applications:

- `apps/frontend`: React, TypeScript, and Vite partner portal
- `apps/backend`: Django REST API

## Run the frontend

```sh
cd apps/frontend
bun install
bun run dev
```

## Run the backend

```sh
cd apps/backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Keep each app's environment variables and deployment settings in its own directory. For Vercel, set the project root to `apps/frontend`. For Render, set the service root directory to `apps/backend`; its existing build and process files remain there.

The original frontend and backend histories are retained in this repository.
