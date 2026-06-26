import ApiError from '../utils/ApiError.js';

const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    // Assign validated data back to request (in-place modification for Express 5 compatibility)
    if (parsed.body) {
      req.body = parsed.body;
    }
    if (parsed.query) {
      for (const key in req.query) {
        delete req.query[key];
      }
      Object.assign(req.query, parsed.query);
    }
    if (parsed.params) {
      for (const key in req.params) {
        delete req.params[key];
      }
      Object.assign(req.params, parsed.params);
    }

    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.slice(1).join('.') || err.path.join('.'),
        message: err.message,
      }));
      return next(new ApiError(400, 'Validation failed', formattedErrors));
    }
    next(error);
  }
};

export default validate;
