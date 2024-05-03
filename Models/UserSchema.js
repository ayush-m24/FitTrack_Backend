//Store user data 

const mongoose = require('mongoose');
//Import the bcrypt library for hashing passwords
const bcrypt = require('bcrypt');

//Defines a user schema in Mongoose with automatic timestamping for tracking creation and modification times
const userSchema = new mongoose.Schema({ //Creates the collection and defines the type of objects to be stord
    name: {
        type: String,
        required: true,
    },

    password: {
        type: String,
        required: true,
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    weight: [  //The weight being added and an array to store multiple weight values and the date for when it was added.
        {
            weight: {
                type: Number,
                required: true,
            },
            date: {
                type: Date,
                required: true,
            },
        }
    ],

    height: [
        {
            height: {
                type: Number,
                required: true,
            },
            date: {
                type: Date,
                required: true,
            },
        }
    ],

    gender: {
        type: String,
        required: true,
    },

    dob: {
        type: String,
        required: true,
    },

    goal: {
        type: String,
        required: true,
    },

    calorieIntake: [
        {
            // item,
            // date,
            // quantity,
            // quantitytype,
            // calorieIntake:

            item: {   //Type (eg: - rice, pasta)
                type: String,
                required: true,
            },
            date: {
                type: Date,
                required: true,
            },
            quantity: {
                type: Number,
                required: true,
            },
            quantitytype: {  //That is in 'grams'
                type: String,
                required: true,
            },
            calorieIntake: {
                type: Number,
                required: true,
            },

        }
    ],

    activityLevel: { //Fitness goal decided based on level. (moderate, heavy)
        type: String,
        required: true,
    },

    sleep: [
        {
            date: {
                type: Date,
                required: true,
            },
            durationInHrs: {
                type: Number,
                required: true,
            },
        },
    ],

    steps: [
        {
            date: {
                type: Date,
                required: true,
            },
            steps: {
                type: Number,
                required: true,
            },
        },
    ],

    workouts: [
        {
            date: {
                type: Date,
                required: true,
            },
            exercise: {
                type: String,
                required: true,
            },
            durationInMinutes: {
                type: Number,
                required: true,
            },
        },
    ],

    water: [
        {
            date: {
                type: Date,
                required: true,
            },
            amountInMilliliters: {
                type: Number,
                required: true,
            },
        },
    ],

}, {timestamps: true});

//If user changes their password then before saving user data
userSchema.pre('save', async function (next) {
    const user = this;

    //Check is user password has been changed
    if (user.isModified('password')) {
        //If changed then hashes the password for security before saving user data 
        user.password = await bcrypt.hash(user.password, 8);
    }

    next(); //Completes the save operation
});

//Export the user schema
const User = mongoose.model('User', userSchema);
module.exports = User;