const jwt = require('jsonwebtoken');
let middlewaresObj = {};

middlewaresObj.authenticateToken = function authenticateToken(req, res, next){
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if(!token){
    return res.sendStatus(401);
  } else {
    jwt.verify(token, process.env.JWT_TOKEN_SECRET_KEY, (err, token) => {
      if(err){
        switch(err.name){
          case "TokenExpiredError":
            return res.sendStatus(401);
          default:
            res.sendStatus(403);
        }
      }
      req.token = token;
      next();
    })
  }
  // ideally you will want to use secure, httpOnly cookie, but because of free-tier limitation
  // resorting to header instead of cookie
  // if(req.cookies && req.cookies.AUTH_JWT){
  //   let token = req.cookies.AUTH_JWT;
  //   jwt.verify(token, process.env.JWT_TOKEN_SECRET_KEY, (err, token) => {
  //     if(err){
  //       return res.sendStatus(403);
  //     }
  //     let timeNow = new Date();
  //     let exp = new Date(token.exp * 1000);

  //     if(timeNow > exp){
  //       return res.sendStatus(401);
  //     }

  //     req.token = token;
  //     next();
  //   })
  // } else {
  //   res.sendStatus(401);
  // }
}

module.exports = middlewaresObj;