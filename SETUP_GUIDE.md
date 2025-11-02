# AgroConnect - Quick Setup Guide

Follow these steps to run AgroConnect locally on your machine.

## Prerequisites

1. **Node.js** (v14+) - [Download](https://nodejs.org/)
2. **MySQL Server** (v8.0+) - [Download](https://dev.mysql.com/downloads/mysql/)

## Setup Steps

### 1. Install MySQL

Install MySQL and remember your root password.

### 2. Configure Database Connection

Edit the `.env` file in the project root:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password_here
DB_NAME=agroconnect
DB_PORT=3306

JWT_SECRET=agroconnect_super_secret_jwt_key_change_in_production_2025
PORT=3000
```

**Important**: Change `DB_PASSWORD` to your MySQL root password.

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
npm run setup-db
```

This creates the database and all tables automatically.

### 5. Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

### 6. Access the Application

Open your browser and go to:

```
http://localhost:3000
```

## Default Admin Login

- **Email**: admin@agroconnect.com
- **Password**: admin123

**Change this password after first login!**

## User Workflow

### Farmers
1. Register as "Farmer"
2. Wait for admin approval
3. Login and add products
4. Manage orders and inventory

### Buyers
1. Register as "Buyer"
2. Wait for admin approval
3. Login and browse products
4. Add to cart and place orders

### Admin
1. Login with default credentials
2. Approve pending user registrations
3. Monitor all platform activity
4. Send broadcast messages to users

## Troubleshooting

**Can't connect to database?**
- Check MySQL is running
- Verify `.env` credentials are correct
- Ensure MySQL is on port 3306

**Port 3000 already in use?**
- Change `PORT` in `.env` file
- Or stop other services using port 3000

**Login fails?**
- Ensure your account is approved by admin
- Check credentials are correct
- Try clearing browser cache

## Project Structure

```
agroconnect/
├── config/          - Database configuration
├── middleware/      - Authentication middleware
├── routes/          - API routes
├── public/          - Frontend files (HTML/CSS/JS)
├── server.js        - Express server
├── setup-database.js - Database setup script
└── .env             - Environment variables
```

## Support

For detailed information, see the full `README.md` file.

---

Built for the Kumira-GEC Challenge 2025
