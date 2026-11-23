# Food Atlas

Food Atlas is a web application for discovering and managing restaurant
information. It uses a Flask backend and MongoDB database, with
Flask-rendered pages for login, the homepage, the restaurant map, and
adding a restaurant spot.

## Features

-   User registration, login, logout, and session-status checking.
-   Browse restaurant records stored in MongoDB.
-   Filter restaurants by category, cuisine, and location.
-   Search restaurant names, cuisines, descriptions, addresses, and
    categories.
-   Create, retrieve, update, and delete restaurant records through API
    endpoints.
-   View database statistics, including restaurant count, user count,
    average rating, and top-rated restaurants.

## Tech Stack

-   Python
-   Flask
-   MongoDB and PyMongo
-   Flask-CORS
-   HTML templates rendered by Flask

## Repository Structure

``` text
Food-Atlas/
├── templates/                 # HTML pages rendered by Flask
├── FoodAtlas.restaurants.csv  # Restaurant dataset
├── app.py                     # Flask application and API routes
└── requirements.txt           # Python dependencies
```

## Getting Started

### 1. Clone the repository

``` bash
git clone https://github.com/Teja-006/Food-Atlas.git
cd Food-Atlas
```

### 2. Create and activate a virtual environment

**Windows PowerShell:**

``` powershell
python -m venv .venv
.venv\\Scripts\\Activate.ps1
```

**macOS / Linux:**

``` bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install dependencies

``` bash
pip install -r requirements.txt
```

### 4. Start MongoDB

The current application connects to MongoDB at:

``` text
mongodb://localhost:27017/
```

Make sure MongoDB is installed and running locally. The application uses
the `FoodAtlas` database and the `restaurants` and `users` collections.

**Using MongoDB Atlas or another MongoDB instance:** Update the
`MONGO_URI` value in `app.py` with your connection string. The current
code defines this value directly in the application.

### 5. Set the Flask secret key

The application reads `SECRET_KEY` from the environment and has a
development fallback. Set a unique secret key before running outside a
local development environment.

**Windows PowerShell:**

``` powershell
$env:SECRET_KEY = "replace-with-a-long-random-secret"
```

**macOS / Linux:**

``` bash
export SECRET_KEY="replace-with-a-long-random-secret"
```

### 6. Run the application

``` bash
python app.py
```

Open:

``` text
http://localhost:5000
```

## Application Pages

  Route            Purpose
  ---------------- ----------------------------
  `/`              Login page
  `/homepage`      Main homepage
  `/mappage`       Restaurant map page
  `/addspotpage`   Add a restaurant spot page

## API Endpoints

### Authentication

  Method   Endpoint        Description
  -------- --------------- ---------------------------------------
  `POST`   `/register`     Register a user
  `POST`   `/login`        Log in a user
  `POST`   `/logout`       Clear the current session
  `GET`    `/check-auth`   Check whether a user is authenticated

### Restaurants

  ------------------------------------------------------------------------------------
  Method                  Endpoint                             Description
  ----------------------- ------------------------------------ -----------------------
  `GET`                   `/api/restaurants`                   Retrieve restaurants
                                                               with optional filters

  `GET`                   `/api/restaurants/<restaurant_id>`   Retrieve one restaurant
                                                               by ID

  `POST`                  `/api/restaurants`                   Add a restaurant

  `PUT`                   `/api/restaurants/<restaurant_id>`   Update a restaurant

  `DELETE`                `/api/restaurants/<restaurant_id>`   Delete a restaurant

  `GET`                   `/api/search?q=<query>`              Search restaurant
                                                               records

  `GET`                   `/api/stats`                         Retrieve restaurant and
                                                               user statistics
  ------------------------------------------------------------------------------------

The `/api/restaurants` endpoint supports these optional query
parameters:

-   `category`
-   `cuisine`
-   `location`
-   `search`
-   `limit`

Example:

``` text
http://localhost:5000/api/restaurants?cuisine=Indian&limit=10
```

## Restaurant Dataset

The repository includes `FoodAtlas.restaurants.csv`. The Flask startup
code connects to MongoDB; it does not automatically import the CSV.
Import the dataset into the `restaurants` collection if you want those
records available to the application. Check that the CSV columns and
data types match the fields used by the application.

## Security Notes

Before deploying this project publicly, address these development-stage
security concerns:

-   The current registration and login implementation stores and
    compares passwords as plain text. Use a password-hashing solution
    such as Werkzeug's password utilities or Argon2.
-   Set a strong, unique `SECRET_KEY`; do not rely on the development
    fallback.
-   Keep database credentials and other secrets out of source control.
-   Review authentication and authorization for restaurant update and
    delete operations.
-   Disable Flask debug mode in production.

## Contributing

Suggestions and contributions are welcome. Fork the repository, create a
feature branch, make your changes, and open a pull request.

## License

No license file is currently specified in this repository. All rights
are reserved unless the repository owner adds a license.
