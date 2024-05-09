//Import the Express library for web server functionality.
const express = require('express');
//Create a router object to define routes.
const router = express.Router();
//Import a middleware that checks and validates authentication tokens.
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import the jsonwebtoken library, which seems unused in the given context.
const jwt = require('jsonwebtoken');
//Import a custom error handling middleware for managing errors across the application.
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the request library for making HTTP requests, unused in provided routes.
const request = require('request');
//Import the User schema/model for accessing the User collection in the database.
const User = require('../Models/UserSchema');
//Load environment variables from the .env file.
require('dotenv').config();

//Define a function to create a standardized response format.
function createResponse(ok, message, data) {
    return {
        ok, 
        message, 
        data, 
    };
}

//Define a GET route for testing API functionality, secured by authTokenHandler.
router.get('/test', authTokenHandler, async (req, res) => {
    res.json(createResponse(true, 'Test API works for report'));
});

//Define a GET route to generate a user's daily health report, secured by authTokenHandler.
router.get('/getreport', authTokenHandler, async (req, res) => {
    //Retrieve the user ID from the authentication token.
    const userId = req.userId;
    //Fetch the user document from the database using their ID.
    const user = await User.findById({ _id: userId });
    //Define today's date for filtering daily data.
    let today = new Date();
    today.setHours(0, 0, 0, 0); // Set time to the start of the day for accurate comparison.

    // Function to check if a date is within the last 10 days.
    const isWithinLast10Days = (date) => {
        const tenDaysAgo = new Date(today);
        tenDaysAgo.setDate(tenDaysAgo.getDate() - 10); // Set to 10 days ago.
        return date >= tenDaysAgo && date <= today;
    };

    //Initialize a variable to accumulate today's calorie intake.
    let calorieIntake = 0;
    //Sum up calorie intake from the last 10 days.
    user.calorieIntake.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (isWithinLast10Days(entryDate)) {
            calorieIntake += entry.calorieIntake;
        }
    });

    //Initialize a variable to accumulate today's total sleep in hours.
    let sleep = 0;
    //Iterate through each sleep entry to sum up last 10 days entry
    user.sleep.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (isWithinLast10Days(entryDate)) {
            sleep += entry.durationInHrs;
        }
    });

    //Initialize a variable to accumulate today's water intake in milliliters.
    let water = 0;
    //Iterate through each water intake entry to sum up today's total.
    user.water.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (isWithinLast10Days(entryDate)) {
            water += entry.amountInMilliliters;
        }
    });

    //Initialize a variable to accumulate today's steps.
    let steps = 0;
    //Iterate through each step entry to sum up today's total.
    user.steps.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (isWithinLast10Days(entryDate)) {
            steps += entry.steps;
        }
    });

    //Retrieve the latest recorded weight and height from the user's profile.
    let weight = user.weight[user.weight.length - 1].weight;
    let height = user.height[user.height.length - 1].height;

    //Initialize a variable to count the number of workouts this week.
    let workout = 0;
    //Iterate through each workout entry within the last week.
    user.workouts.forEach(entry => {
        let entryDate = new Date(entry.date);
        if (isWithinLast10Days(entryDate)) {
            workout += 1;
        }
    });

    //Calculate Basal Metabolic Rate (BMR) and adjust for weight goals.
    let maxCalorieIntake = 0;
    let heightInCm = parseFloat(user.height[user.height.length - 1].height);
    let weightInKg = parseFloat(user.weight[user.weight.length - 1].weight);
    let age = new Date().getFullYear() - new Date(user.dob).getFullYear();
    let BMR = 0;
    let gender = user.gender;
    if (gender == 'male') {
        BMR = 88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age)
    }
    else if (gender == 'female') {
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age)
    }
    else {
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age)
    }
    if (user.goal == 'weightLoss') {
        maxCalorieIntake = (BMR - 500) * 10;
    }
    else if (user.goal == 'weightGain') {
        maxCalorieIntake = (BMR + 500) * 10;
    }
    else {
        maxCalorieIntake = BMR * 10;
    }

    //Calculate goal weight using BMI and height.
    let goalWeight = 22 * ((height / 100) ** 2);

    //Define goal workouts per week based on user's goal.
    let goalWorkout = (user.goal === "weightLoss") ? 7 : (user.goal === "weightGain" ? 4 : 5);

    //Define goal steps based on user's goal.
    let goalSteps = (user.goal === "weightLoss") ? 10000 : (user.goal === "weightGain" ? 50000 : 75000);

    //Set a standard goal for daily sleep and water intake.
    let goalSleep = 60;
    let goalWater = 40000;

    //Compile all collected data into a response object.
    let tempResponse = [
        {name: "Calorie Intake", value: calorieIntake, goal: maxCalorieIntake, unit: "cal"},
        {name: "Sleep", value: sleep, goal: goalSleep, unit: "hrs"},
        {name: "Steps", value: steps, goal: goalSteps, unit: "steps"},
        {name: "Water", value: water, goal: goalWater, unit: "ml"},
        {name: "Workout", value: workout, goal: goalWorkout, unit: "days"},
        {name: "Weight", value: weight, goal: goalWeight, unit: "kg"},
        {name: "Height", value: height, goal: "", unit: "cm"},
    ]

    //Send the compiled data as the response.
    res.json(createResponse(true, 'Report', tempResponse));
})

//Export the router module to be used in other parts of the application.
module.exports = router;
