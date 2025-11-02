# AgroConnect Installation Checklist

Use this checklist to verify your installation is complete and working properly.

## Pre-Installation

- [ ] Node.js installed (v14 or higher)
- [ ] MySQL Server installed (v8.0 or higher)
- [ ] MySQL service is running
- [ ] You know your MySQL root password

## Installation Steps

- [ ] Project files downloaded/extracted
- [ ] Opened terminal in project directory
- [ ] Ran `npm install` successfully
- [ ] Created/edited `.env` file with MySQL credentials
- [ ] Ran `npm run setup-db` successfully
- [ ] Database "agroconnect" created
- [ ] Admin user created

## Verification

- [ ] Server starts with `npm start`
- [ ] No errors in terminal
- [ ] Can access `http://localhost:3000` in browser
- [ ] Homepage loads correctly
- [ ] Can navigate to login page
- [ ] Can login with admin credentials:
  - Email: admin@agroconnect.com
  - Password: admin123

## Testing User Flows

### Admin Flow
- [ ] Login as admin
- [ ] View dashboard statistics
- [ ] Can see "User Management" section
- [ ] Can see "All Orders" section
- [ ] Can access broadcast feature

### Farmer Registration Flow
- [ ] Logout from admin
- [ ] Click "Register"
- [ ] Fill form as "Farmer"
- [ ] Submit registration
- [ ] See "pending approval" message
- [ ] Login as admin
- [ ] Approve the farmer account
- [ ] Logout and login as farmer
- [ ] Can access farmer dashboard

### Buyer Registration Flow
- [ ] Register as "Buyer"
- [ ] Get approved by admin
- [ ] Login as buyer
- [ ] Can access buyer dashboard

### Complete Transaction Flow
- [ ] Login as farmer
- [ ] Add a product (e.g., Tomatoes, 50 BDT/kg, 100 kg available)
- [ ] Logout and login as buyer
- [ ] Browse products and find the farmer's product
- [ ] Add to cart with quantity
- [ ] Place order with delivery address
- [ ] Check notification received
- [ ] Logout and login as farmer
- [ ] See new order notification
- [ ] Confirm the order
- [ ] Mark order as delivered
- [ ] Login as admin
- [ ] See order in admin dashboard
- [ ] View statistics updated

### Broadcast Feature
- [ ] Login as admin
- [ ] Create broadcast message
- [ ] Select target (All Users/Farmers/Buyers)
- [ ] Send broadcast
- [ ] Login as farmer or buyer
- [ ] Check notification received

## Troubleshooting Checklist

If something doesn't work:

### Server won't start
- [ ] Check `.env` file exists and has correct values
- [ ] Run `npm install` again
- [ ] Check if port 3000 is available
- [ ] Look for error messages in terminal

### Can't connect to database
- [ ] Verify MySQL is running
- [ ] Check MySQL credentials in `.env`
- [ ] Try connecting to MySQL manually
- [ ] Check firewall isn't blocking MySQL

### Login fails
- [ ] Verify database setup completed
- [ ] Check user status is "active" not "pending"
- [ ] Clear browser cookies/cache
- [ ] Check browser console for errors (F12)

### Pages don't load
- [ ] Check server is running
- [ ] Verify correct URL (http://localhost:3000)
- [ ] Check browser console for errors
- [ ] Try different browser

## Success Criteria

Your installation is successful if:

✅ Server starts without errors
✅ You can login as admin
✅ You can register and approve users
✅ Farmers can add products
✅ Buyers can browse and order products
✅ Notifications work
✅ Orders appear in all relevant dashboards
✅ Broadcast messages reach users

## Getting Help

If you're stuck:

1. Check the error message in terminal
2. Review the README.md file
3. Verify all prerequisites are installed
4. Check MySQL connection separately
5. Ensure all files are in correct locations

## Final Notes

- Remember to change admin password after first login
- Keep your `.env` file secure and never commit it to version control
- The `.env` file contains sensitive credentials
- Make regular backups of your MySQL database

---

Good luck with AgroConnect!
