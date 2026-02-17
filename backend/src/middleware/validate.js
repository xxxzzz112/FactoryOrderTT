const { ZodError } = require('zod');
const { HttpError } = require('../utils/httpError');

function validate({ body, query, params }) {
  return (req, res, next) => {
    try {
      const parsed = {};
      if (body) parsed.body = body.parse(req.body);
      if (query) parsed.query = query.parse(req.query);
      if (params) parsed.params = params.parse(req.params);
      req.validated = parsed;
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(new HttpError(400, '参数校验失败', err.flatten()));
      }
      return next(err);
    }
  };
}

module.exports = { validate };

