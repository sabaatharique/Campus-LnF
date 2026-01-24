-- ENUM TYPES
CREATE TYPE gender_enum AS ENUM ('male', 'female');

CREATE TYPE report_status_enum AS ENUM ('active', 'completed', 'expired');

CREATE TYPE request_status_enum AS ENUM ('pending', 'accepted', 'rejected');


-- USER
CREATE TABLE "User" (
    user_id INT PRIMARY KEY,
    name VARCHAR(100),
    gender gender_enum,
    contact_number BIGINT
);


-- AUTH
CREATE TABLE Auth (
    auth_id INT PRIMARY KEY,
    user_id INT UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id)
);


-- NOTIFICATION
CREATE TABLE Notification (
    notification_id INT PRIMARY KEY,
    user_id INT NOT NULL,
    message TEXT,
    FOREIGN KEY (user_id) REFERENCES "User"(user_id)
);


-- LOCATION
CREATE TABLE Location (
    location_id INT PRIMARY KEY,
    name VARCHAR(100),
);


-- LOST REPORT
CREATE TABLE Lost_Report (
    lost_id INT PRIMARY KEY,
    creator_id INT NOT NULL,
    last_location_id INT NOT NULL,
    title VARCHAR(50),
    description TEXT,
    lost_at TIMESTAMP,
    status report_status_enum,
    FOREIGN KEY (creator_id) REFERENCES "User"(user_id),
    FOREIGN KEY (last_location_id) REFERENCES Location(location_id)
);


-- FOUND REPORT
CREATE TABLE Found_Report (
    found_id INT PRIMARY KEY,
    creator_id INT NOT NULL,
    found_location_id INT NOT NULL,
    title VARCHAR(50),
    description TEXT,
    found_at TIMESTAMP,
    status report_status_enum,
    FOREIGN KEY (creator_id) REFERENCES "User"(user_id),
    FOREIGN KEY (found_location_id) REFERENCES Location(location_id)
);


-- CLAIM REQUEST
CREATE TABLE Claim_Request (
    claim_id INT PRIMARY KEY,
    requester_id INT NOT NULL,
    found_report_id INT NOT NULL,
    message TEXT,
    timestamp TIMESTAMP,
    status request_status_enum,
    FOREIGN KEY (requester_id) REFERENCES "User"(user_id),
    FOREIGN KEY (found_report_id) REFERENCES Found_Report(found_id)
);


-- RETURN REQUEST
CREATE TABLE Return_Request (
    return_id INT PRIMARY KEY,
    requester_id INT NOT NULL,
    lost_report_id INT NOT NULL,
    message TEXT,
    timestamp TIMESTAMP,
    status request_status_enum,
    FOREIGN KEY (requester_id) REFERENCES "User"(user_id),
    FOREIGN KEY (lost_report_id) REFERENCES Lost_Report(lost_id)
);


-- IMAGES
CREATE TABLE Images (
    image_id INT PRIMARY KEY,
    image_url TEXT NOT NULL
);


-- LOST REPORT IMAGES
CREATE TABLE Lost_Report_Images (
    lost_id INT NOT NULL,
    image_id INT NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (lost_id) REFERENCES Lost_Report(lost_id)
);


-- FOUND REPORT IMAGES
CREATE TABLE Found_Report_Images (
    found_id INT NOT NULL,
    image_id INT NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (found_id) REFERENCES Found_Report(found_id),
);


-- CLAIM REQUEST IMAGES
CREATE TABLE Claim_Request_Images (
    claim_id INT NOT NULL,
    image_id INT NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (claim_id) REFERENCES Claim_Request(claim_id)
);


-- RETURN REQUEST IMAGES
CREATE TABLE Return_Request_Images (
    return_id INT NOT NULL,
    image_id INT NOT NULL,
    image_url TEXT NOT NULL,
    PRIMARY KEY (image_id),
    FOREIGN KEY (return_id) REFERENCES Return_Request(return_id)
);


-- CATEGORY TAGS
CREATE TABLE Category_Tags (
    category_id INT PRIMARY KEY,
    name CHAR(30)
);

--LOST REPORT CATEGORY
CREATE TABLE Category_Lost_Report (
    lost_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (lost_id, category_id),
    FOREIGN KEY (lost_id) REFERENCES Lost_Report(lost_id),
    FOREIGN KEY (category_id) REFERENCES Category_Tags(category_id)
);

--FOUND REPORT CATEGORY
CREATE TABLE Category_Found_Report (
    found_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (found_id, category_id),
    FOREIGN KEY (found_id) REFERENCES Found_Report(found_id),
    FOREIGN KEY (category_id) REFERENCES Category_Tags(category_id)
);


-- LOST REPORT TAGS
CREATE TABLE Lost_Report_Tags (
    lost_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (lost_id, category_id),
    FOREIGN KEY (lost_id) REFERENCES Lost_Report(lost_id),
    FOREIGN KEY (category_id) REFERENCES Category_Tags(category_id)
);


-- FOUND REPORT TAGS
CREATE TABLE Found_Report_Tags (
    found_id INT NOT NULL,
    category_id INT NOT NULL,
    PRIMARY KEY (found_id, category_id),
    FOREIGN KEY (found_id) REFERENCES Found_Report(found_id),
    FOREIGN KEY (category_id) REFERENCES Category_Tags(category_id)
);