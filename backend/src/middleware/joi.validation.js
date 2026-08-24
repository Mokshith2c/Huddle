import Joi from "joi";

export const signUpSchema = Joi.object({
  name: Joi.string().min(2).required(),
  username: Joi.string().min(3).required(),
  password: Joi.string().min(4).required()
});

export const signInSchema = Joi.object({
  username: Joi.string().required(),
  password: Joi.string().min(4).required()
});

export const updateTagsSchema = Joi.object({
  tags: Joi.array().items(Joi.string().trim().min(1).max(24)).max(10).required()
});

export const validateRequest = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ message: error.details[0].message});
    }
    req.body = value;
    next();
  };
};
