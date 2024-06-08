const express = require('express');
const axios = require('axios');

const app = express();
const port = 9876;

// Configurations
const WINDOW_SIZE = 5;
const TIMEOUT = 500; // Timeout in milliseconds

// Dummy authorization token (replace with your actual token)
const AUTH_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJNYXBDbGFpbXMiOnsiZXhwIjoxNzE3ODI2MDY1LCJpYXQiOjE3MTc4MjU3NjUsImlzcyI6IkFmZm9yZG1lZCIsImp0aSI6IjE0ZWQ0ODNlLWJhZjgtNDE3ZS1iZTRhLTljODIzNjc3N2MzNiIsInN1YiI6InBhbDkwNTg5NTAwQGdtYWlsLmNvbSJ9LCJjb21wYW55TmFtZSI6IkFLR0VDIiwiY2xpZW50SUQiOiIxNGVkNDgzZS1iYWY4LTQxN2UtYmU0YS05YzgyMzY3NzdjMzYiLCJjbGllbnRTZWNyZXQiOiJ3cmxveXlIZG9yWUlacFlWIiwib3duZXJOYW1lIjoiUmFodWwiLCJvd25lckVtYWlsIjoicGFsOTA1ODk1MDBAZ21haWwuY29tIiwicm9sbE5vIjoiMjEwMDI3MTY0MDAwNyJ9.XpkbAo4y0lCpIE1NB72_Cpx8SmAsGBiPeoej8BjlBS0';

// To store numbers with a fixed window size and ensure uniqueness
let numbersWindow = [];
let numbersSet = new Set();

// Third-party API mapping for different types of numbers
const THIRD_PARTY_API_MAP = {
    'p': 'http://20.244.56.144/test/primes', // Prime numbers
    'f': 'http://20.244.56.144/test/fibo', // Fibonacci numbers
    'e': 'http://20.244.56.144/test/even', // Even numbers
    'r': 'http://20.244.56.144/test/rand' // Random numbers
};

// Middleware to check authorization token
const authorize = (req, res, next) => {
    const token = req.headers.authorization;

    if (!token || token !== `Bearer ${AUTH_TOKEN}`) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    next();
};

// Apply authorization middleware to all routes
app.use(authorize);

app.get('/numbers/:numberid', async (req, res) => {
    const { numberid } = req.params;
    const startTime = Date.now();

    try {
        const newNumber = await fetchNumberFromApi(numberid);
        if (newNumber !== null) {
            storeNumber(newNumber);
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

    const elapsedTime = Date.now() - startTime;
    if (elapsedTime > TIMEOUT) {
        return res.status(504).json({ error: 'Processing time exceeded 500 ms' });
    }

    const storedNumbersBefore = [...numbersWindow];
    const newAverage = calculateAverage();

    const responseData = {
        stored_numbers_before: storedNumbersBefore,
        stored_numbers_after: [...numbersWindow],
        average: newAverage
    };

    res.json(responseData);
});

async function fetchNumberFromApi(numberid) {
    let url = THIRD_PARTY_API_MAP[numberid];
    if (!url) return null;

    // Handle special cases where API requires a specific position (like nth value)
    if (numberid === 'p' || numberid === 'f') {
        const position = Math.floor(Math.random() * 100) + 1; // Random position for demonstration
        url = url.replace('{n}', position);
    }

    try {
        const response = await axios.get(url, { timeout: TIMEOUT });
        if (response.status === 200) {
            if (numberid === 'e') {
                const number = response.data.number;
                // Manually check if the number is even
                if (number % 2 === 0) {
                    return number;
                } else {
                    return await fetchNumberFromApi(numberid); // Recursively fetch if not even
                }
            } else if (numberid === 'r') {
                return parseInt(response.data.trim(), 10); // Random.org returns plain text
            }
            return response.data.value; // For APIs returning the number directly
        }
    } catch (error) {
        console.error('Error fetching from API:', error.message);
    }
    return null;
}

function storeNumber(number) {
    if (!numbersSet.has(number)) {
        if (numbersWindow.length >= WINDOW_SIZE) {
            const oldestNumber = numbersWindow.shift();
            numbersSet.delete(oldestNumber);
        }
        numbersWindow.push(number);
        numbersSet.add(number);
    }
}

function calculateAverage() {
    if (numbersWindow.length === 0) {
        return 0;
    }
    const sum = numbersWindow.reduce((acc, num) => acc + num, 0);
    return sum / numbersWindow.length;
}

app.listen(port, () => {
    console.log(`Average Calculator microservice running on port ${port}`);
});
