const jwt = require('jsonwebtoken');
let middlewaresObj = {};

middlewaresObj.authenticateToken = function authenticateToken(req, res, next){
  if(req.cookies && req.cookies.AUTH_JWT){
    let token = req.cookies.AUTH_JWT;
    jwt.verify(token, process.env.JWT_TOKEN_SECRET_KEY, (err, token) => {
      if(err){
        return res.sendStatus(403);
      }
      let timeNow = new Date();
      let exp = new Date(token.exp * 1000);

      if(timeNow > exp){
        return res.sendStatus(401);
      }

      req.token = token;
      next();
    })
  } else {
    res.sendStatus(401);
  }
}

module.exports = middlewaresObj;