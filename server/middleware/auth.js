const jwt = require('jsonwebtoken');
const User = require('../models/User');


/*
-----------------------------------------
PROTECT ROUTES (JWT AUTH)
-----------------------------------------
*/

exports.protect = async (req, res, next) => {

  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {

    token = req.headers.authorization.split(' ')[1];

  }

  if (!token) {

    return res.status(401).json({
      message: 'Not authorized, token missing'
    });

  }

  try {

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        message: 'User no longer exists'
      });
    }

    req.user = user;

    next();

  } catch (err) {

    return res.status(401).json({
      message: 'Not authorized, token invalid'
    });

  }

};


/*
-----------------------------------------
ROLE AUTHORIZATION
-----------------------------------------
*/

exports.authorize = (...roles) => {

  return (req, res, next) => {

    if (!roles.includes(req.user.role)) {

      return res.status(403).json({
        message: `Role ${req.user.role} not allowed`
      });

    }

    next();

  };

};