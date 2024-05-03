//Import the Express module
const express = require('express');
//Create a router object from Express to handle routing
const router = express.Router();
//Import the Admin model schema for database operations
const Admin = require('../Models/AdminSchema'); 
//Import the bcrypt library for hashing passwords
const bcrypt = require('bcrypt');
//Import custom error handling middleware
const errorHandler = require('../Middlewares/errorMiddleware');
//Import middleware for checking admin authentication tokens
const adminTokenHandler = require('../Middlewares/checkAdminToken');
//Import jsonwebtoken for creating and managing tokens
const jwt = require('jsonwebtoken');

//Define a function to create a standardized response format
function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

//Define POST route for admin registration
router.post('/register', async (req, res, next) => {
    try {
        //Destructure request body to extract name, email, and password
        const { name, email, password } = req.body;

        //Check if an admin already exists with the given email
        const existingAdmin = await Admin.findOne({ email });

        //If an admin exists, return a conflict status
        if (existingAdmin) {
            return res.status(409).json(createResponse(false, 'Admin with this email already exists'));
        }

        //Hash the password and create a new admin object
        const hashedPassword = await bcrypt.hash(password, 10); //Added line to correctly handle hashing
        const newAdmin = new Admin({
            name,
            email,
            password: hashedPassword
        });

        //Save the new admin to the database
        await newAdmin.save();

        //Return a success response
        res.status(201).json(createResponse(true, 'Admin registered successfully'));
    } catch (err) {
        //Pass any exceptions to the next error handling middleware
        next(err);
    }
});

//Define POST route for admin login
router.post('/login', async (req, res, next) => {
    try {
        //Destructure email and password from request body
        const { email, password } = req.body;

        //Find the admin by email
        const admin = await Admin.findOne({ email });

        //If no admin found, return an error response
        if (!admin) {
            return res.status(400).json(createResponse(false, 'Invalid admin credentials'));
        }

        //Compare the submitted password with the hashed password in the database
        const isMatch = await bcrypt.compare(password, admin.password);
        if (!isMatch) {
            return res.status(400).json(createResponse(false, 'Invalid admin credentials'));
        }

        //Generate a JWT for the admin
        const adminAuthToken = jwt.sign({ adminId: admin._id }, process.env.JWT_ADMIN_SECRET_KEY, { expiresIn: '10m' });

        //Set the JWT in an HTTP-only cookie
        res.cookie('adminAuthToken', adminAuthToken, { httpOnly: true });
        //Return a success response with the token
        res.status(200).json(createResponse(true, 'Admin login successful', { adminAuthToken }));
    } catch (err) {
        //Pass any exceptions to the next error handling middleware
        next(err);
    }
});

// Define GET route to check if admin is logged in using the authentication token
router.get('/checklogin', adminTokenHandler, async (req, res) => {
    // Return a response confirming the admin is authenticated
    res.json({
        adminId: req.adminId,
        ok: true,
        message: 'Admin authenticated successfully'
    })
})

// Use the custom error handling middleware for the router
router.use(errorHandler)

// Export the router to be used in other parts of the application
module.exports = router;
