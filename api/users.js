// Imports
require('dotenv').config();
const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const JWT_SECRET = process.env.JWT_SECRET;

// Models
const { User } = require('../models')

// controllers
const test = async (req, res) => {
    res.json({ message: 'User endpoint OK!'});
}

const signup = async (req, res) => {
    console.log('---INSIDE OF SIGNUP---')
    console.log('req.body =>', req.body)
    const {name, email, password} = req.body;

    try {
        const user = await User.findOne({ email })
        // if a user exists, return 400 error and message
        if (user) {
            return res.status(400).json({message: 'Email already exists'})
        } else {
            console.log('Create new user');
            let saltRounds = 12;
            let salt = await bcrypt.genSalt(saltRounds);
            let hash = await bcrypt.hash(password, salt);

            const newUser = new User({
                name,
                email,
                password: hash
            });

            let savedNewUser = await newUser.save();

            res.json(savedNewUser)
        }
    } catch (error) {
        console.log('Error inside of /api/users/signup')
        console.log(error)
        return res.status(400).json({message: 'Error occurred. Please try again...'})
    }

}

const login = async (req, res) => {
    const {email, password} = req.body;

    try {
        const user = await User.findOne({email})
        console.log(user)

        if (!user) {
            return res.status(400).json({message: 'User not found....'})
        } else {
            let isMatch = await bcrypt.compare(password, user.password);
            console.log('password correct', isMatch)
            if (isMatch){
                // add one to timesLoggedIn
                let logs = user.timesLoggedIn + 1
                user.timesLoggedIn = logs;
                const savedUser = await user.save();

                const payload = {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    expiredToken: Date.now()
                }

                try {
                    let token = await jwt.sign(payload, JWT_SECRET, {expiresIn: 3600})
                    console.log('token', token)
                    let legit = await jwt.verify(token, JWT_SECRET, {expiresIn: 60})
                    res.json({
                        success: true,
                        token: `Bearer ${token}`,
                        userData: legit
                    })
                } catch (error) {
                    console.log('----Error in isMatch conditional----')
                    console.log(error)
                    res.status(400).json({message: 'Session has ended. Please log in again.'})
                }
            } else {
                res.status(400).json({message: 'Either email or password is incorrect'})
            }
        }
    } catch (error) {
        console.log(`--- Error inside of /api/users/login`)
        console.log(error)
        return res.status(400).json({message: 'Either email or password is incorrect'})
    }
   
}

const profile = async (req, res) => {
    console.log('Inside of PROFILE route')
    const {id, name, email} = req.user
    res.json({
        id: id,
        name: name,
        email: email
    })
}

// routes
router.get('/test', test);

// POST api/users/register (Public)
router.post('/signup', signup)


// POST api/users/login (Public)
router.post('/login', login);

// GET api/users/profile (Private)
router.get('/profile', passport.authenticate('jwt', { session: false }), profile);
// router.get('/all-users', fetchUsers);

module.exports = router; 