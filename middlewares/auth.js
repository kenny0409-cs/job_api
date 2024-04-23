const jwt = require('jsonwebtoken');
const User  = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncError');
const ErrorHandler = require('../utils/errorhandle');

// check if the user is authenticated 
exports.isAuthenticatedUser = catchAsyncErrors(async(req,res,next)=> {
    let token;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer')){
        token = req.headers.authorization.split(' ')[1];
    }

    if(!token)
    {
        return next(new ErrorHandler('login first to access this resource', 401));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET); //verify the token and the secret if is same
    req.user = await User.findById(decoded.id);  //get the id of the user in that decoded variable

    next();
});

// handling users roles
exports.authorizeRole = (...roles) => {
    return (req, res ,next) => {
        if(!roles.includes(req.user.role)) {
            return next(new ErrorHandler(`Role(${req.user.role}) is not allow to access this resource`, 403))
        }
        next();
    }
}