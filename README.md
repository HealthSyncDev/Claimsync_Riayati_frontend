# Hospital Management System (Frontend)

A modern, responsive frontend application for the Hospital Management System (CRS Dashboard), built with React and Vite. This application provides role-based interfaces for Admins and Users (Patients/Staff) to manage hospital operations, appointments, and reports.

## 🚀 Technologies Used

- **Framework:** [React](https://react.dev/)
- **Build Tool:** [Vite](https://vitejs.dev/)
- **Styling:** CSS3 (Variables, Flexbox/Grid, Glassmorphism)
- **Routing:** [React Router v6](https://reactrouter.com/)
- **State Management:** Context API
- **HTTP Client:** [Fetch API] / Axios (if applicable)

## 📂 Project Structure

The project follows a modular directory structure to ensure scalability and maintainability.

```
hospital-frontend/
├── public/                 # Static assets
├── src/
│   ├── assets/            # Images and media files
│   ├── components/        # Reusable UI components
│   │   ├── common/        # Buttons, inputs, generic UI elements
│   │   ├── sidebar/       # Navigation sidebar
│   │   └── topbar/        # Header and user controls
│   ├── context/           # Global state (e.g., AuthContext)
│   ├── layouts/           # Page layouts (Admin, User, Auth)
│   ├── pages/             # Application pages
│   │   ├── admin/         # Admin-specific pages (Dashboard, Users, Office, etc.)
│   │   ├── auth/          # Authentication pages (Login)
│   │   └── user/          # User-specific pages (Dashboard, Reports)
│   ├── services/          # API services and configuration
│   ├── styles/            # Global and variable CSS files
│   ├── App.jsx            # Main application component & routing
│   └── main.jsx           # Application entry point
├── .env                   # Environment variables
├── package.json           # Project dependencies and scripts
└── README.md              # Project documentation
```

## 🛠️ Setup & Installation

Follow these steps to set up the project locally.

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn

### Installation

1.  **Clone the repository:**
    ```bash
    git clone <repository_url>
    cd hospital-frontend
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file in the root directory (if not exists) and configure your backend URL:
    ```env
    VITE_API_BASE_URL=http://your-backend-api-url
    ```

4.  **Run the development server:**
    ```bash
    npm run dev
    ```
    The application will usually run at `http://localhost:5173`.

## 📜 Scripts

- `npm run dev`: Starts the development server.
- `npm run build`: Builds the app for production.
- `npm run lint`: Runs ESLint to check for code quality issues.
- `npm run preview`: Previews the production build locally.

## 🤝 Git Workflow

To contribute to this project, please follow these guidelines:

1.  **Branching:**
    - `master`: Production-ready code.
    - `dev`: Active development branch.

2.  **Contribution Steps:**
    - Pull the latest changes from `dev`: `git pull origin dev`
    - Create a new feature branch: `git checkout -b feature/your-feature-name`
    - Commit your changes: `git commit -m "feat: Add new dashboard widget"`
    - Push to the remote: `git push origin feature/your-feature-name`
    - Create a Pull Request (PR) to merge into `dev`.

## ✨ Features

- **Authentication:** Secure login for Admins and Users.
- **Role-Based Access Control:** Separate dashboards and routes for different user roles.
- **Admin Dashboard:** Manage users, offices, categories, designations, and view reports.
- **User/Patient Portal:** View personal dashboard and reports.
- **Responsive Design:** Optimized for various screen sizes.
