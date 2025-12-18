# DigiBook

A full-stack digital library management system for managing books, users, and borrowing operations.

## Overview

DigiBook is a web-based library management application that enables users to browse books, borrow them, and manage their library experience. The system includes role-based access control with admin and user roles.

## Architecture

### Client (`DigiBook-Client`)
- **Technology**: HTML, CSS, JavaScript, Bootstrap 5
- **Features**:
  - User authentication (login/register)
  - Book browsing and search
  - Book borrowing and return
  - Waiting list management
  - User management (admin only)
  - Responsive UI

### Server (`DigiBook-Server`)
- **Technology**: Node.js, Express, MongoDB, Mongoose
- **Features**:
  - RESTful API
  - JWT authentication
  - User and book management
  - Borrowing system with date tracking
  - Role-based authorization
  - Image upload support

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MongoDB database
- npm or yarn

### Server Setup

```bash
cd DigiBook-Server
npm install
```

Create a `.env` file:
```
MONGO_URI=your_mongodb_connection_string
PORT=3001
JWT_SECRET=your_jwt_secret
```

Start the server:
```bash
node index.js
```

### Client Setup

```bash
cd DigiBook-Client
```

Open `index.html` in a web browser or use a local server.

## Project Structure

```
DigiBook-Client/
├── index.html          # Authentication page
├── pages/              # Application pages
│   ├── home_page.html  # Main book browsing
│   ├── borrowing_book.html
│   └── users_managment.html
└── images/             # Book images and assets

DigiBook-Server/
├── index.js            # Server entry point
├── models/             # Mongoose schemas
│   ├── Book.js
│   └── User.js
├── routes/             # API routes
│   ├── books.js
│   ├── users.js
│   └── books_to_users.js
└── utils/              # Utility functions
```

## API Endpoints

- `/books` - Book CRUD operations
- `/users` - User management and authentication
- `/booksToUsers` - Borrowing operations

## Features

- ✅ User registration and authentication
- ✅ Book catalog with categories
- ✅ Book borrowing with date tracking
- ✅ Waiting list for unavailable books
- ✅ Admin panel for user management
- ✅ Image upload for books
- ✅ Role-based access control

## License

ISC

