//Create and send token and save in cookie 
const sendToken  = (user,statusCode, res ) => {
    //Create JWT token
    const token = user.getJwtToken();


    //Pass Option for cookie
    const option = {
        expires : new Date(Date.now() + process.env.COOKIE_EXPIRES_TIME * 24*60*60*1000),
        httpOnly : true
    };

    /*if(process.env.NODE_ENV === 'production ')
    {
        option.secure = true;
    }*/

    res
        .status(statusCode) 
        .cookie('token', token, option)
        .json({
            success : true,
            token
        });
}  

module.exports = sendToken;