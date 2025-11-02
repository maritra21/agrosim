# AgroConnect - Connecting Farmers and Buyers in Chattogram

AgroConnect is a web platform that directly connects local farmers with buyers, creating a stable, efficient, and transparent food supply chain for the Chattogram region.

## The Story

In a small village near Kumira, Abdul Karim is a hardworking farmer whose vegetables are the freshest in the area. However, his livelihood is fragile due to middlemen exploitation, transport delays, and inconsistent earnings.

Meanwhile, 25 kilometers away in GEC Circle, Shahed Alam runs a popular cafe and desperately wants a steady source of high-quality, local produce.

**AgroConnect bridges this gap**, empowering farmers like Abdul Karim and connecting them with buyers like Shahed Alam.

## Features

### For Farmers
- Create and manage product listings with prices and quantities
- Receive direct orders from buyers with instant notifications
- Track order status and earnings
- Full control over inventory and pricing

### For Buyers
- Browse fresh, local produce from verified farmers
- Place orders directly with transparent pricing
- Track order history and spending
- Support local farmers in the community

### For Admins (Control Tower)
- Approve and manage user registrations
- Monitor all transactions and orders
- Send broadcast messages to specific user groups or all users
- View comprehensive statistics and analytics
- Ensure platform safety and reliability

## Technology Stack

- **Backend**: Node.js, Express
- **Database**: MySQL
- **Frontend**: HTML, CSS, JavaScript
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcrypt

## Prerequisites

Before running this project, make sure you have:

1. **Node.js** (v14 or higher) - [Download here](https://nodejs.org/)
2. **MySQL Server** (v8.0 or higher) - [Download here](https://dev.mysql.com/downloads/mysql/)

## Local Setup Instructions

### Step 1: Install MySQL

1. Download and install MySQL from the official website
2. During installation, set a root password (remember this!)
3. Start the MySQL service

### Step 2: Clone or Download the Project

Download the project files to your local machine.

### Step 3: Install Dependencies

Open a terminal in the project directory and run:

```bash
npm install
```

This will install all required Node.js packages.

### Step 4: Configure Environment Variables

1. Copy the `.env.example` file and rename it to `.env`
2. Edit the `.env` file with your MySQL credentials:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=agroconnect
DB_PORT=3306

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
PORT=3000
```

**Important**: Replace `your_mysql_password` with the MySQL root password you set during installation.

### Step 5: Set Up the Database

Run the database setup script:

```bash
npm run setup-db
```

This will:
- Create the `agroconnect` database
- Create all necessary tables
- Set up the schema with proper indexes
- Create a default admin account

### Step 6: Start the Server

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The server will start on `http://localhost:3000`

### Step 7: Access the Application

Open your browser and navigate to:

```
http://localhost:3000
```

## Default Admin Account

After setting up the database, you can login with:

- **Email**: `admin@agroconnect.com`
- **Password**: `admin123`

**Important**: Change this password after your first login!

## User Roles

### 1. Farmer
- Register as a farmer
- List products with prices and quantities
- Manage inventory
- Receive and manage orders
- Track earnings

### 2. Buyer
- Register as a buyer (restaurant/shop owner)
- Browse available products
- Add items to cart
- Place orders
- Track order history

### 3. Admin
- Approve/suspend user registrations
- Monitor all platform activity
- Send broadcast messages
- View analytics and statistics
- Ensure platform integrity

## How to Use

### For Farmers

1. **Register**: Go to the registration page and select "Farmer" as your role
2. **Wait for Approval**: An admin will review and approve your account
3. **Login**: Once approved, login with your credentials
4. **Add Products**: Click "Add Product" and fill in the details
5. **Manage Orders**: When buyers order from you, you'll receive notifications
6. **Update Status**: Confirm orders and mark them as delivered

### For Buyers

1. **Register**: Go to the registration page and select "Buyer" as your role
2. **Wait for Approval**: An admin will review and approve your account
3. **Login**: Once approved, login with your credentials
4. **Browse Products**: View all available products from local farmers
5. **Add to Cart**: Select quantities and add items to your cart
6. **Place Order**: Provide delivery details and place your order
7. **Track Orders**: Monitor order status in your dashboard

### For Admins

1. **Login**: Use the admin credentials
2. **Review Users**: Approve or suspend new registrations
3. **Monitor Activity**: View all orders and transactions
4. **Send Broadcasts**: Communicate with farmers, buyers, or all users
5. **View Analytics**: Track platform growth and activity

## Database Schema

### Tables

1. **users** - Stores farmer, buyer, and admin accounts
2. **products** - Stores farmer product listings
3. **orders** - Stores order information
4. **order_items** - Stores individual items in each order
5. **notifications** - Stores user notifications
6. **broadcast_messages** - Stores admin broadcast history

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get single product
- `POST /api/products` - Add new product (farmer only)
- `PUT /api/products/:id` - Update product (farmer only)
- `DELETE /api/products/:id` - Delete product (farmer only)

### Orders
- `GET /api/orders` - Get user's orders
- `GET /api/orders/:id` - Get single order
- `POST /api/orders` - Create new order (buyer only)
- `PUT /api/orders/:id/status` - Update order status

### Admin
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/status` - Update user status
- `GET /api/admin/statistics` - Get platform statistics
- `POST /api/admin/broadcast` - Send broadcast message
- `GET /api/admin/broadcasts` - Get broadcast history

### Notifications
- `GET /api/notifications` - Get user notifications
- `GET /api/notifications/unread-count` - Get unread count
- `PUT /api/notifications/:id/read` - Mark as read
- `PUT /api/notifications/mark-all-read` - Mark all as read

## Security Features

- Password hashing with bcrypt
- JWT-based authentication
- Role-based access control
- Protected API endpoints
- SQL injection prevention
- Admin approval for new users

## Troubleshooting

### Cannot connect to MySQL
- Ensure MySQL service is running
- Check your `.env` file has correct credentials
- Verify MySQL is running on port 3306

### Database setup fails
- Make sure MySQL user has sufficient privileges
- Try running MySQL as administrator
- Check if port 3306 is not blocked by firewall

### Server won't start
- Check if port 3000 is already in use
- Ensure all dependencies are installed (`npm install`)
- Verify `.env` file exists and is properly configured

### Login fails
- Ensure your account is approved by admin
- Check email and password are correct
- Clear browser cache and cookies

## Project Structure

```
agroconnect/
├── config/
│   └── database.js          # Database connection
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   ├── auth.js              # Authentication routes
│   ├── products.js          # Product routes
│   ├── orders.js            # Order routes
│   ├── admin.js             # Admin routes
│   └── notifications.js     # Notification routes
├── public/
│   ├── index.html           # Landing page
│   ├── login.html           # Login page
│   ├── register.html        # Registration page
│   ├── farmer-dashboard.html
│   ├── buyer-dashboard.html
│   ├── admin-dashboard.html
│   ├── styles.css           # Global styles
│   └── js/
│       ├── auth.js          # Auth utilities
│       ├── farmer-dashboard.js
│       ├── buyer-dashboard.js
│       └── admin-dashboard.js
├── server.js                # Express server
├── setup-database.js        # Database setup script
├── package.json
├── .env.example
└── README.md
```

## Future Enhancements

- Real-time chat between farmers and buyers
- Payment gateway integration
- Mobile application
- Product images upload
- Rating and review system
- Delivery tracking with GPS
- Multi-language support (Bengali/English)
- SMS notifications
- Advanced analytics dashboard

## Support

For any issues or questions, please contact the development team.

## License

MIT License - Built for the Kumira-GEC Challenge 2025

---

**AgroConnect** - Empowering farmers, connecting communities.
