const User = require('../models/users');
const catchAsyncErrors = require('../middlewares/catchAsyncError');
const ErrorHandler = require('../utils/errorhandle');
const sendToken = require('../utils/jwttoken');
const sendEmail = require('../utils/sendEmail');
const crypto = require('crypto');


//Register a new user => /api/v1/register
exports.registerUser = catchAsyncErrors(async (req,res,next) => {
    const {name,email,password,role} = req.body;

    const user  = await User.create({
        name,
        email,
        password,
        role
    });

    sendToken(user, 200 , res );

});

//Login user => /api/v1/login

exports.loginUser = catchAsyncErrors(async (req,res,next) => {
    const {email, password} = req.body;

    //check if email or password is entered
    if(!email || !password)
    {
         return next(new ErrorHandler('please enter email & password', 400))
    }


    //finding user in database
    const user  = await User.findOne({email}).select('+password');
    if(!user){
        return next(new ErrorHandler('Invalid Email or password', 401))
    }

    //check if password is correct
    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched)
    {
        return next(new ErrorHandler('Invalid Email or Password',401));
    }

    //create JSON web token
    sendToken(user, 200, res);
});

//Forgot password => /api/v1/password/forgot
exports.forgotPassword = catchAsyncErrors (async ( req,res,next) => { 
    const user  = await User.findOne({email : req.body.email});

    //check user email is in database
    if(!user)
    {
        return next(new ErrorHandler('No user found with this email.', 404));
    }

    const resetToken = user.getResetPasswordToken();

    await user.save({ validateBeforeSave : false});

    //Create reset password url
    const resetUrl = `${req.protocol}://${req.get('host')}/api/v1/password/reset/${resetToken}`;

    const message = `Your password reset link is as follow:\n\n${resetUrl}\n\n If you have not request this, then please ignore that.`

    try {
        await sendEmail({
            email : user.email,
            subject : 'Password reset email',
            message 
        });
    
        res.status(200).json({
            success : true,
            message : `Email send successfully to: ${user.email}`
        });
    } catch(error) {
        user.resetPasswordToken = undefined;
        user.resetPasswordExpire = undefined;
        
        await user.save({ validateBeforeSave : false});

        return next(new ErrorHandler('Email is not send.'), 500);
    }
});

//Reset Password => /api/v1/password/reset/:token
exports.resetPassword = catchAsyncErrors(async ( req,res,next) => {
    const resetPasswordToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

    console.log('this is my reset password token : ',resetPasswordToken);
    const user = await User.findOne({ 
        resetPasswordToken , 
        resetPasswordExpire: {$gt : Date.now() }
    }); // finding the user that is doing resetpassword


    if(!user){
        return next(new ErrorHandler('Password reset token is invalid or expired', 400));
    }

    //setup new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire =  undefined;
    await user.save();

    sendToken(user,200,res);

});

//Logout user => /api/v1/logout
exports.logout = catchAsyncErrors(async(req, res, next) => {
    res.cookie('token', 'none', {
        expire : new Date(Date.now()),
        httpOnly : true
    });

    res.status(200).json({
        success : true,
        message : 'Logged out successfully'
    });
});