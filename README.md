# PLZ-Zuordnung

Desktop-friendly search tool for finding the responsible person for a German
postal code or locality.

## Features

- Sign in with Microsoft Entra ID or Basic Auth
- Search by PLZ or locality for all signed-in users
- Show the import UI only to admins with the Entra app role value `Assignment.Import`
- Replace assignment data through Excel import
- Store application data in SQLite
- Optional Electron wrapper with a configurable search hotkey such as `F9` or `Ctrl+Alt+K`

## Access model

- Normal users: search only
- Admin users: search plus import
- Entra admin detection is based on the token `roles` claim containing the app role value
- Default accepted admin role values are `Assignment.Import` and `Admin`
- Basic Auth remains a local fallback mode with import access enabled

## Setup

Copy `.env.example` to `.env.local` and fill in the values.

Required variables:

- `AUTH_METHOD=entra` or `AUTH_METHOD=basic`
- `APP_COMPANY_NAME` for the company label in the UI
- `AUTH_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_ID`
- `AUTH_MICROSOFT_ENTRA_ID_SECRET`
- `AUTH_MICROSOFT_ENTRA_ID_TENANT_ID`
- `AUTH_MICROSOFT_ENTRA_ID_ADMIN_ROLE_VALUES`
- `BASIC_AUTH_PASSWORD` when `AUTH_METHOD=basic`

Entra requirements:

- Create or reuse an Entra application registration
- Add an app role with a suitable value such as `Assignment.Import`
- Assign that role to users who should be allowed to import
- Make sure the signed-in token contains the `roles` claim
- The app checks the role `Value`, not the display name shown in the Entra portal
- Configure the local redirect URI:
  `http://localhost:3000/api/auth/callback/microsoft-entra-id`

## Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Validation

```bash
npm run test
npm run lint
npm run build
```

## Usage

### Search

- Number input is treated as PLZ
- Exact PLZ matches are preferred before prefix matches
- Text input searches localities
- The current data set always comes from the latest successful import

Example searches:

- `10115`
- `Berlin`

### Import

- Only available to admins with a matching Entra role value such as `Assignment.Import`
- Accepts `.xlsx` and `.xlsm`
- Automatically selects the most suitable worksheet
- Header rows are allowed
- Column A must contain PLZ values
- Column B must contain the responsible person
- A new import replaces all existing assignments
- For duplicate PLZ entries, the last row wins

## Electron

Development:

```bash
npm run electron:dev
```

Windows package:

```bash
npm run electron:pack -- --app-url=https://your-app.example.com
```

The Electron app:

- opens the web app
- uses `F9` by default and lets users capture another shortcut directly in the UI
- supports combinations such as `Ctrl+Alt+K`
- focuses the search field when triggered

## Configuration notes

- SQLite defaults to `data/app.db`
- Reference PLZ data is loaded on first start
- Missing auth variables are shown on the login page
- GeoNames attribution lives in `data/reference/ATTRIBUTION.md`

## Troubleshooting

- `OAuthCallbackError` on login:
  verify the redirect URI and make sure
  `AUTH_MICROSOFT_ENTRA_ID_SECRET` contains the secret value, not the secret ID
- Import link does not appear:
  confirm the signed-in Entra token includes the app role value, for example
  `Assignment.Import`, in the `roles` claim
- User can search but cannot import:
  the account is authenticated, but no configured admin role value was found
- No search results after setup:
  import an Excel file first
