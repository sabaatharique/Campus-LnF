-- Drop views first to avoid column name mismatch errors when adding new columns
DROP VIEW IF EXISTS vw_lost_reports;
DROP VIEW IF EXISTS vw_found_reports;

-- View for fetching all lost reports with user and location details
CREATE OR REPLACE VIEW vw_lost_reports AS
SELECT
    lr.lost_id,
    lr.creator_id,
    lr.title,
    lr.description,
    lr.lost_at,
    lr.status,
    l.name AS location_name,
    u.name AS user_name,
    a.email AS user_email,
    u.student_id AS user_student_id,
    u.contact_number AS user_contact_number,
    ARRAY(SELECT t.name FROM Tags t JOIN Lost_Report_Tags lrt ON t.tag_id = lrt.category_id WHERE lrt.lost_id = lr.lost_id)::text[] AS tags,
    ARRAY(SELECT lri.image_url FROM Lost_Report_Images lri WHERE lri.lost_id = lr.lost_id) AS image_urls
FROM
    Lost_Report lr
JOIN
    Users u ON lr.creator_id = u.user_id
JOIN
    Auth a ON u.user_id = a.user_id
JOIN
    Location l ON lr.last_location_id = l.location_id;

-- View for fetching all found reports with user and location details
CREATE OR REPLACE VIEW vw_found_reports AS
SELECT
    fr.found_id,
    fr.creator_id,
    fr.title,
    fr.description,
    fr.found_at,
    fr.status,
    l.name AS location_name,
    u.name AS user_name,
    a.email AS user_email,
    u.student_id AS user_student_id,
    u.contact_number AS user_contact_number,
    ARRAY(SELECT t.name FROM Tags t JOIN Found_Report_Tags frt ON t.tag_id = frt.category_id WHERE frt.found_id = fr.found_id)::text[] AS tags,
    ARRAY(SELECT fri.image_url FROM Found_Report_Images fri WHERE fri.found_id = fr.found_id) AS image_urls
FROM
    Found_Report fr
JOIN
    Users u ON fr.creator_id = u.user_id
JOIN
    Auth a ON u.user_id = a.user_id
JOIN
    Location l ON fr.found_location_id = l.location_id;

-- ============================================
-- ANALYTICAL QUERIES (FUN STATS)
-- ============================================

-- Query 1 (Rollup): Count requests rolling up by request type and status
CREATE OR REPLACE VIEW vw_requests_by_status_rollup AS
WITH AllRequests AS (
    SELECT 'Claim Request' AS request_type, status FROM Claim_Request
    UNION ALL
    SELECT 'Return Request' AS request_type, status FROM Return_Request
)
SELECT 
    COALESCE(request_type, 'All Requests') AS request_type,
    COALESCE(status::text, 'All Statuses') AS status,
    COUNT(*) AS total_count
FROM AllRequests
GROUP BY ROLLUP(request_type, status);

-- Query 2 (Cube): Global activity summarized by report type and status
CREATE OR REPLACE VIEW vw_global_activity_cube AS
WITH AllReports AS (
    SELECT 'Lost' AS report_type, status FROM Lost_Report
    UNION ALL
    SELECT 'Found' AS report_type, status FROM Found_Report
)
SELECT 
    COALESCE(report_type, 'All Types') AS report_type,
    COALESCE(status::text, 'All Statuses') AS status,
    COUNT(*) AS total_count
FROM AllReports
GROUP BY CUBE(report_type, status);

-- Query 3 (Grouping): Lost vs. Found counts globally by month/year
CREATE OR REPLACE VIEW vw_monthly_trends AS
WITH AllReports AS (
    SELECT 'Lost' AS report_type, EXTRACT(YEAR FROM lost_at) AS report_year, EXTRACT(MONTH FROM lost_at) AS report_month FROM Lost_Report
    UNION ALL
    SELECT 'Found' AS report_type, EXTRACT(YEAR FROM found_at) AS report_year, EXTRACT(MONTH FROM found_at) AS report_month FROM Found_Report
)
SELECT 
    COALESCE(report_year::text, 'All Years') AS report_year,
    COALESCE(report_month::text, 'All Months') AS report_month,
    COUNT(CASE WHEN report_type = 'Lost' THEN 1 END) AS lost_count,
    COUNT(CASE WHEN report_type = 'Found' THEN 1 END) AS found_count
FROM AllReports
GROUP BY GROUPING SETS (
    (report_year, report_month),
    (report_year),
    ()
);

-- Query 4 (Average): Average resolution time mapped by location and ranked
CREATE OR REPLACE VIEW vw_report_resolution_time AS
WITH CompletedReports AS (
    SELECT l.name AS location_name, EXTRACT(EPOCH FROM (cr.claimed_at - fr.found_at))/3600 AS resolution_hours
    FROM Found_Report fr
    JOIN Claim_Request cr ON fr.found_id = cr.found_report_id AND cr.status = 'accepted'
    JOIN Location l ON fr.found_location_id = l.location_id
    UNION ALL
    SELECT l.name AS location_name, EXTRACT(EPOCH FROM (rr.returned_at - lr.lost_at))/3600 AS resolution_hours
    FROM Lost_Report lr
    JOIN Return_Request rr ON lr.lost_id = rr.lost_report_id AND rr.status = 'accepted'
    JOIN Location l ON lr.last_location_id = l.location_id
)
SELECT 
    location_name,
    ROUND(CAST(AVG(resolution_hours) AS NUMERIC), 2) AS avg_resolution_hours,
    RANK() OVER (ORDER BY AVG(resolution_hours) ASC) AS fastest_resolution_rank
FROM CompletedReports
GROUP BY location_name;

-- Query 5 (Rank): Rank locations by the absolute highest number of lost/found items
CREATE OR REPLACE VIEW vw_top_locations AS
WITH LocationCounts AS (
    SELECT 
        l.name AS location_name,
        COUNT(DISTINCT lr.lost_id) AS lost_count,
        COUNT(DISTINCT fr.found_id) AS found_count,
        COUNT(DISTINCT lr.lost_id) + COUNT(DISTINCT fr.found_id) AS total_reports
    FROM Location l
    LEFT JOIN Lost_Report lr ON l.location_id = lr.last_location_id
    LEFT JOIN Found_Report fr ON l.location_id = fr.found_location_id
    GROUP BY l.name
)
SELECT 
    location_name,
    lost_count,
    found_count,
    total_reports,
    DENSE_RANK() OVER (ORDER BY total_reports DESC) AS activity_rank
FROM LocationCounts;
