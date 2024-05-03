//Import the Express library for creating a server
const express = require('express');
//Initialize a router object from Express for handling routes
const router = express.Router();
//Import the authentication token checking middleware
const authTokenHandler = require('../Middlewares/checkAuthToken');
//Import the jsonwebtoken library for handling JWT operations
const jwt = require('jsonwebtoken');
//Import a custom error handling middleware
const errorHandler = require('../Middlewares/errorMiddleware');
//Import the request library for making HTTP requests
const request = require('request');
//Import the User schema/model from the Models directory
const User = require('../Models/UserSchema');
//Load environment variables from the .env file
require('dotenv').config();

//Define a function to standardize API response structure
function createResponse(ok, message, data) {
    return {ok, message, data};
}

//Define a GET route to test token authentication and respond with a simple message
router.get('/test', authTokenHandler, async (req, res) => {
    res.json(createResponse(true, 'Test API works for calorie intake report'));
});

//Define a POST route for adding calorie intake entries
router.post('/addcalorieintake', authTokenHandler, async (req, res) => {
    //Destructure and extract required fields from the request body
    const { item, date, quantity, quantitytype } = req.body;
    //Validate the input to ensure all required fields are provided
    if (!item || !date || !quantity || !quantitytype) {
        return res.status(400).json(createResponse(false, 'Please provide all the details'));
    }
    //Initialize a variable to store quantity in grams
    let qtyingrams = 0;
    //Convert quantities to grams based on the type specified
    if (quantitytype === 'g') {
        qtyingrams = quantity;
    } else if (quantitytype === 'kg') {
        qtyingrams = quantity * 1000;
    } else if (quantitytype === 'ml') {
        qtyingrams = quantity;
    } else if (quantitytype === 'l') {
        qtyingrams = quantity * 1000;
    } else {
        //Return an error if the quantity type is not supported
        return res.status(400).json(createResponse(false, 'Invalid quantity type'));
    }

    //Prepare to send a request to an external API (API Ninja) to fetch nutrition data
    var query = item;
    request.get({ 
        url: 'https://api.api-ninjas.com/v1/nutrition?query=' + query,
        headers: {'X-Api-Key': process.env.NUTRITION_API_KEY}, //Api key ggenerated and held in the .env file
    }, async function (error, response, body) {
        //Handle errors from the request or bad responses
        if (error) return console.error('Request failed:', error);
        else if (response.statusCode != 200) return console.error('Error:', response.statusCode, body.toString('utf8'));
        else {
             // body :[ {  This is an example of the data that will be produced
            //     "name": "rice",
            //     "calories": 127.4,
            //     "serving_size_g": 100,
            //     "fat_total_g": 0.3,
            //     "fat_saturated_g": 0.1,
            //     "protein_g": 2.7,
            //     "sodium_mg": 1,
            //     "potassium_mg": 42,
            //     "cholesterol_mg": 0,
            //     "carbohydrates_total_g": 28.4,
            //     "fiber_g": 0.4,
            //     "sugar_g": 0.1
            // }]

            //Parse the JSON response body
            body = JSON.parse(body);
            //Calculate calorie intake based on the nutrition data and provided quantity
            //Get calorie for one gram then multiply by the provided quantity. Assumed that the calculation is for only one item
            let calorieIntake = (body[0].calories / body[0].serving_size_g) * parseInt(qtyingrams);
            //Fetch the user from the database using the user ID from the request
            const userId = req.userId;
            const user = await User.findOne({_id: userId});
            //Add the new calorie intake entry to the user's data
            user.calorieIntake.push({
                item,
                date: new Date(date),
                quantity,
                quantitytype,
                calorieIntake: parseInt(calorieIntake)
            })

            //Save the updated user data
            await user.save();
            //Return a success response
            res.json(createResponse(true, 'Calorie intake added successfully'));
        }
    });

})

//Define a POST route to get calorie intake by a specific date, using authentication middleware
router.post('/getcalorieintakebydate', authTokenHandler, async (req, res) => {
    const { date } = req.body; //Extract the date from the request body
    const userId = req.userId; //Retrieve the user ID set by the authentication middleware
    const user = await User.findById({ _id: userId }); //Find the user in the database by their ID
    if (!date) { //Check if a date was not provided in the request
        let date = new Date(); //Use the current date as default
        user.calorieIntake = filterEntriesByDate(user.calorieIntake, date); //Filter the user's calorie entries to only include today's entries to exclude the time as well

        return res.json(createResponse(true, 'Calorie intake for today', user.calorieIntake)); //Respond with today's calorie intake
    }
    //If a date is provided, filter the user's calorie intake entries for that specific date
    user.calorieIntake = filterEntriesByDate(user.calorieIntake, new Date(date));
    res.json(createResponse(true, 'Calorie intake for the date', user.calorieIntake)); //Respond with the calorie intake for the provided date

})

//Define a POST route to get calorie intake for a given number of past days or all entries, using authentication middleware
router.post('/getcalorieintakebylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body; //Extract the limit from the request body
    const userId = req.userId; //Retrieve the user ID set by the authentication middleware
    const user = await User.findById({ _id: userId }); //Find the user in the database by their ID
    if (!limit) { //Check if a limit was not provided
        return res.status(400).json(createResponse(false, 'Please provide limit')); //Respond with an error if no limit is provided
    } else if (limit === 'all') { //Check if the limit provided is 'all'
        return res.json(createResponse(true, 'Calorie intake', user.calorieIntake)); //Return all calorie intake entries
    }
    else {
        let date = new Date(); //Get the current date
        let currentDate = new Date(date.setDate(date.getDate() - parseInt(limit))).getTime(); //Calculate the date from 'limit' days ago. 

        user.calorieIntake = user.calorieIntake.filter((item) => { //Filter the user's calorie intake entries based on the calculated date
            return new Date(item.date).getTime() >= currentDate; //Only include entries from 'limit' days ago to now. Eg if 5 days then last 5 days. 
        })

        return res.json(createResponse(true, `Calorie intake for the last ${limit} days`, user.calorieIntake)); //Respond with the filtered entries

    }
})

//Set up a DELETE route to remove a calorie intake entry, using the authentication token middleware
router.delete('/deletecalorieintake', authTokenHandler, async (req, res) => {
    //Extract item and date from the request body
    const { item, date } = req.body;
    //Validate the presence of item and date in the request
    if (!item || !date) {
        //Respond with a 400 status code if item or date is missing
        return res.status(400).json(createResponse(false, 'Please provide all the details'));
    }

    //Retrieve the user ID from the authentication token
    const userId = req.userId;
    //Find the user by their ID in the database
    const user = await User.findById({ _id: userId });

    //Filter out the calorie intake entry that matches the provided item and date
    user.calorieIntake = user.calorieIntake.filter((entry) => {
        return entry.date.toString() !== new Date(date).toString();
    });
    //Save the updated user data
    await user.save();
    //Respond with a success message
    res.json(createResponse(true, 'Calorie intake deleted successfully'));

})

//Define a GET route to calculate and return the goal calorie intake, using authentication token middleware
router.get('/getgoalcalorieintake', authTokenHandler, async (req, res) => {
    //Retrieve the user ID from the authentication token
    const userId = req.userId;
    // Find the user by their ID in the database
    const user = await User.findById({ _id: userId });
    //Initialize a variable for maximum calorie intake
    let maxCalorieIntake = 1200;
    //Extract the latest height in cm from the user's profile
    let heightInCm = parseFloat(user.height[user.height.length - 1].height);
    //Extract the latest weight in kg from the user's profile
    let weightInKg = parseFloat(user.weight[user.weight.length - 1].weight);
    //Calculate the user's age based on their date of birth
    let age = new Date().getFullYear() - new Date(user.dob).getFullYear();
    //Initialize a variable for Basal Metabolic Rate (BMR)
    let BMR = 0;
    //Retrieve the user's gender from their profile
    let gender = user.gender;
    //Calculate BMR based on the user's gender, weight, height, and age
    if (gender == 'male') {
        BMR = 88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age)
    }
    else if (gender == 'female') {
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age)
    }
    else {
        //Use the female formula by default if gender is not specified
        BMR = 447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age)
    }
    //Adjust the maximum calorie intake based on the user's goal
    if (user.goal == 'weightLoss') {
        maxCalorieIntake = (BMR - 500) * 10;  //Reduce intake for weight loss. reduce 500 calories. x10 for 10days
    }
    else if (user.goal == 'weightGain') {
        maxCalorieIntake = (BMR + 500) * 10;  //Increase intake for weight gain. increase 500 calories. x10 for 10 days
    }
    else {
        maxCalorieIntake = BMR * 10;  //Maintain intake for weight maintenance
    }

    //Respond with the calculated maximum calorie intake
    res.json(createResponse(true, 'max calorie intake', { maxCalorieIntake }));

})

//Utility function to filter entries by an exact date
function filterEntriesByDate(entries, targetDate) {
    //Filter entries to include only those from the specified date
    return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}
//Export the router module for use in other parts of the application
module.exports = router;



