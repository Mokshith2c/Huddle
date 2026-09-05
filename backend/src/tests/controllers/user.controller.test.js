import { describe, expect, jest } from "@jest/globals";
import { login, register } from "../../controllers/user.controller";
import httpStatus from "http-status";
import { User } from "../../models/user.model";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"

describe("login()", ()=>{
    test("should return 400 when username or password is missing", async() => {
        const req = {
            body: {}
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await login(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith({
            message: "Username and password required"
        });
    });

    test("should return 404 if user is not found", async()=>{
        User.findOne = jest.fn();
        User.findOne.mockResolvedValue(null);
        const req = {
            body: {
                username: "mokshith",
                password: "123456"
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        await login(req, res);
        expect(User.findOne).toHaveBeenCalledWith({
            username: "mokshith"
        });
        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({
            message: "We couldn't find an account with those details."
        });
    })

    test("should return 401 for invalid password", async() => {
        User.findOne = jest.fn();
        User.findOne.mockResolvedValue({
            _id: "123",
            username: "mokshith",
            password: "hashPass"
        });

        bcrypt.compare = jest.fn();
        bcrypt.compare.mockResolvedValue(false);

        const req = {
            body: {
                username: "mokshith",
                password: "123456"
            }
        };
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        await login(req, res);

        expect(bcrypt.compare).toHaveBeenCalledWith(
            "123456",
            "hashPass"
        );
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            message: "Invalid username or password. Please try again."
        });
    })
    test("should return 200 for successful login", async() => {
        User.findOne = jest.fn();
        User.findOne.mockResolvedValue({
            _id: "123",
            username: "mokshith",
            password: "hashedPassword"
        })
        const req = {
            body: {
                username: "mokshith",
                password: "123456"
            }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        bcrypt.compare = jest.fn();
        bcrypt.compare.mockResolvedValue(true);

        jwt.sign = jest.fn();
        jwt.sign.mockReturnValue("fake-token");

        await login(req, res);
        expect(bcrypt.compare).toHaveBeenCalledWith(
          "123456",
          "hashedPassword"
        );
        expect(jwt.sign).toHaveBeenCalledWith(
                {username: "mokshith", _id: "123"},
                process.env.JWT_SECRET,
                {expiresIn: process.env.JWT_EXPIRE}
        );

        expect(res.status).toHaveBeenCalledWith(200);
        expect(res.json).toHaveBeenCalledWith({
            token: "fake-token",
            message: "👋Welcome back! Ready to connect"
        })
    })
});

describe("register()", ()=>{
    test("should return 409 on conflicting username", async() => {
        User.findOne = jest.fn();
        User.findOne.mockResolvedValue({
            username: "mokshith"
        })
        const req = {
            body: {
                name: "A Mokshith",
                username: "mokshith",
                password: "123456"
            }
        }
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        }
        await register(req, res);
        expect(User.findOne).toHaveBeenCalledWith({
            username: "mokshith"
        });
        expect(res.status).toHaveBeenCalledWith(409);
        expect(res.json).toHaveBeenCalledWith({
            message: "That username is already taken. Try another one."
        });
    })
    test("should register a new user successfully", async () => {
        User.findOne = jest.fn();
        User.findOne.mockResolvedValue(null);

        bcrypt.hash = jest.fn();
        bcrypt.hash.mockResolvedValue("hashedPassword");

        jwt.sign = jest.fn();
        jwt.sign.mockReturnValue("fake-token");

        User.prototype.save = jest.fn().mockResolvedValue();

        const req = {
            body: {
                name: "A Mokshith",
                username: "mokshith",
                password: "123456"
            }
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await register(req, res);

        expect(User.findOne).toHaveBeenCalledWith({
            username: "mokshith"
        });

        expect(bcrypt.hash).toHaveBeenCalledWith(
            "123456",
            10
        );

        expect(User.prototype.save).toHaveBeenCalled();

        expect(jwt.sign).toHaveBeenCalledWith(
            {
                username: "mokshith",
                _id: expect.anything()
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRE
            }
        );

        expect(res.status).toHaveBeenCalledWith(httpStatus.CREATED);

        expect(res.json).toHaveBeenCalledWith({
            token: "fake-token",
            message: "You're all set! Welcome to Huddle."
        });
    });
    test("should return 500 if database throws an error", async () => {

        User.findOne = jest.fn();
        User.findOne.mockRejectedValue(new Error("Database Error"));

        const req = {
            body: {
                name: "A Mokshith",
                username: "mokshith",
                password: "123456"
            }
        };

        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        await register(req, res);

        expect(User.findOne).toHaveBeenCalledWith({
            username: "mokshith"
        });

        expect(res.status).toHaveBeenCalledWith(
            httpStatus.INTERNAL_SERVER_ERROR
        );

        expect(res.json).toHaveBeenCalledWith({
            message: "Something went wrong on our end. Please try again."
        });
    });
})