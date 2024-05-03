//Import the jsonwebtoken module to handle JWT operations
const jwt = require('jsonwebtoken');

//Define a middleware function to check the admin authentication token
function checkAdminToken(req, res, next) {
    //Retrieve the admin authentication token from the cookies attached to the request
    const adminAuthToken = req.cookies.adminAuthToken;

    //Check if the admin authentication token is not present
    if (!adminAuthToken) {
        //if no token is provided, return a 401 Unauthorized status with a message
        return res.status(401).json({ message: 'Admin authentication failed: No adminAuthToken provided', ok: false });
    }

    //Verify the token using JWT's verify method
    jwt.verify(adminAuthToken, process.env.JWT_ADMIN_SECRET_KEY, (err, decoded) => {
        //Check if there was an error during verification, indicating the token is invalid
        if (err) {
            //If the token is invalid, return a 401 Unauthorized status with a message
            return res.status(401).json({ message: 'Admin authentication failed: Invalid adminAuthToken', ok: false });
        } else {
            //If the token is valid, attach the decoded admin ID to the request object
            req.adminId = decoded.adminId;
            //call next() to pass control to the next middleware function in the stack
            next();
        }
    });
}

//Export the checkAdminToken function to make it available for import in other files
module.exports = checkAdminToken;
