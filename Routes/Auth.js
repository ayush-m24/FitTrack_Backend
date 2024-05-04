//User login, Sign up routes
//APIs for User authentication

const express = require('express');
const router = express.Router();
const User = require('../Models/UserSchema')
const errorHandler = require('../Middlewares/errorMiddleware');
const authTokenHandler = require('../Middlewares/checkAuthToken');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');

//ejjf qsny insw ngtr
//To allow sending email using the specified email below to send email to website users. 
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'msaayush@gmail.com',
        pass: 'ejjfqsnyinswngtr'
    }
})

//To test the route
router.get('/test', async (req, res) => {
    res.json({
        message: "Auth api is working"
    })
})

//Function to create a standardized response format 
function createResponse(ok, message, data) {
    return { //Structure of the response 
        ok,
        message,
        data,
    };
}

//Api created to register the user
router.post('/register', async (req, res, next) => {
    try {
        //The details taken in and if the user exists 
        const { name, email, password, weightInKg, heightInCm, gender, dob, goal, activityLevel } = req.body;
        const existingUser = await User.findOne({ email: email }); //Check if the user exists 

        if (existingUser) { //if user exists send the following message
            return res.status(409).json(createResponse(false, 'Email already exists'));
        }
        //If user does not exist new user is created with the following fields
        const newUser = new User({ 
            name,
            password,
            email,

            weight: [
                {
                    weight: weightInKg,
                    unit: "kg",
                    date: Date.now()
                }
            ],

            height: [
                {
                    height: heightInCm,
                    date: Date.now(),
                    unit: "cm"
                }
            ],

            gender,
            dob,
            goal,
            activityLevel
        });
        await newUser.save(); //Save new user

        res.status(201).json(createResponse(true, 'User registered successfully'));

    }
    catch (err) { //Pass any errors during the try block to the next middleware/error handler
        next(err);
    }
})

router.post('/login', async (req, res, next) => {
    try { //Take in the email and password
        const { email, password } = req.body;
        const user = await User.findOne({ email }); //check for email. if exists then continue if not...
        if (!user) { //if user does not exist give the following message
            return res.status(400).json(createResponse(false, 'Invalid credentials'));
        } //If user exists check the password from frontend to backend (database) (convert the pass in hash as passwords are saved in hash format in backend)
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json(createResponse(false, 'Invalid credentials')); //If password does not match send this message
        }

        //If user exists generate an authtoken using the jwt secret key which expire in 50m
        const authToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET_KEY, { expiresIn: '50m' });
        //If user exists generate an refreshtoken using the jwt refresh secret key which expire in 100m
        const refreshToken = jwt.sign({ userId: user._id }, process.env.JWT_REFRESH_SECRET_KEY, { expiresIn: '100m' });

        //The authtoken and refreshtoken are sent and saved to the cookies in order for frontend to receive from back end.
        res.cookie('authToken', authToken, { httpOnly: true, secure: true, sameSite: 'None', path: '/' });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true, sameSite: 'None', path: '/' });
        //Once login in successful send the following response
        res.status(200).json(createResponse(true, 'Login successful', {
            authToken,
            refreshToken
        }));
    }
    //Pass any errors during the try block to the next middleware/error handler
    catch (err) {
        next(err);
    }
})

//Define a POST route on the router to handle sending an OTP
router.post('/sendotp', async (req, res, next) => {
    try {
        const { email } = req.body; // Extract the email address from the request body
        const otp = Math.floor(100000 + Math.random() * 900000); // Generate a random 6-digit OTP

        const mailOptions = {  //Define the email options for sending the OTP
            from: 'msaayush@gmail.com', //Sender's email address (ie my email address)
            to: email, //Recipient's email address extracted from the request
            subject: 'OTP for verification', //Subject line of the email
            text: `Your OTP is ${otp}` //Body of the email containing the OTP
        }

        //Send the email using the transporter object configured with SMTP settings
        transporter.sendMail(mailOptions, async (err, info) => {
            if (err) {
                console.log(err); // Log any errors that occur during sending the email
                res.status(500).json(createResponse(false, err.message)); // Respond with a 500 server error status code and the error message
            } else { //If the email is sent successfully, respond with success message and the OTP
                res.json(createResponse(true, 'OTP sent successfully', { otp }));
            }
        });

    }
    catch (err) {
        next(err);
    }
})

//Using the authTokenHandler check login tokens. If tokens are not expired then user autheticated.
router.post('/checklogin', authTokenHandler, async (req, res, next) => {
    res.json({ //If authTokenhandler is passed then next process is intiated
        ok: true,
        message: 'User authenticated successfully'
    })
}) 



router.post('/logout', (req, res) => {
    //Clear the authToken and refreshToken cookies
    res.clearCookie('authToken', { path: '/', httpOnly: true, secure: true, sameSite: 'None'  });
    res.clearCookie('refreshToken', { path: '/', httpOnly: true, secure: true, sameSite: 'None'  });
    //Send a response back to the client
    res.json(createResponse(true, 'Logout successful'));
  });
  


//If any error occurs above the errorHandler middleware will be called automatically 
router.use(errorHandler) 

module.exports = router;

