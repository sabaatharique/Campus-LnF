-- ============================================
-- AUTHENTICATION FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION user_login(
    user_email VARCHAR(255),
    user_password TEXT
)
RETURNS TABLE (
    success BOOLEAN,
    user_id INT,
    message TEXT
) AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM Auth WHERE email = user_email AND password = crypt(user_password, password)) THEN
        RETURN QUERY SELECT FALSE, CAST(NULL AS INT), 'Incorrect email or password.';
    ELSE
        UPDATE Auth
        SET last_login = NOW()
        WHERE email = user_email;

        RETURN QUERY
        SELECT TRUE, a.user_id, 'Login successful!'
        FROM Auth a 
        WHERE a.email = user_email;
    END IF;
END;
$$ LANGUAGE plpgsql;


CREATE OR REPLACE FUNCTION user_signup(
    user_name VARCHAR(100),
    user_contact BIGINT,
    user_email VARCHAR(255),
    user_student_id NUMERIC(9, 0),
    user_password TEXT
)
RETURNS VOID AS $$
DECLARE
    new_user_id INT;
BEGIN
    IF EXISTS (SELECT 1 FROM Auth WHERE email = user_email) THEN
        RAISE EXCEPTION 'Email already registered.';
    END IF;

    IF EXISTS (SELECT 1 FROM Users WHERE student_id = user_student_id) THEN
        RAISE EXCEPTION 'Student ID already registered.';
    END IF;

    INSERT INTO Users (name, student_id, contact_number)
    VALUES (user_name, user_student_id, user_contact)
    RETURNING user_id INTO new_user_id;

    INSERT INTO Auth (user_id, email, password, last_login)
    VALUES (new_user_id, user_email, crypt(user_password, gen_salt('bf')), NOW());
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- LOOKUP FUNCTIONS
-- ============================================

CREATE OR REPLACE FUNCTION get_locations()
RETURNS TABLE (
    location_id INT,
    name VARCHAR(100)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        l.location_id,
        l.name
    FROM
        Location l;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION get_tags()
RETURNS TABLE (
    tag_id INT,
    name VARCHAR(30)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.tag_id,
        t.name
    FROM
        Tags t;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- NOTIFICATION FUNCTIONS
-- ============================================

DROP FUNCTION IF EXISTS get_user_notifications(INT);

CREATE OR REPLACE FUNCTION get_user_notifications(p_user_id INT)
RETURNS TABLE (
    notification_id INT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    is_read BOOLEAN,
    read_at TIMESTAMP WITH TIME ZONE,
    claim_id INT,
    return_id INT,
    requester_name VARCHAR(100),
    requester_message TEXT,
    request_status TEXT, 
    report_type TEXT,
    report_id INT,
    matched_found_id INT,
    matched_lost_id INT,
    item_title VARCHAR(50),
    item_description TEXT,
    location_name VARCHAR(100),
    item_date TIMESTAMP WITH TIME ZONE,
    item_image_url TEXT,
    item_image_urls TEXT[],
    requester_image_urls TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        n.notification_id,
        n.message,
        n.created_at,
        n.is_read,
        CASE
            WHEN n.read_at IS NULL THEN NULL
            ELSE n.read_at
        END,
        n.claim_id,
        n.return_id,
        COALESCE(cu.name, ru.name) AS requester_name,
        COALESCE(cr.message, rr.message) AS requester_message,
        COALESCE(cr.status::TEXT, rr.status::TEXT) AS request_status, 
        CASE
            WHEN fr.found_id IS NOT NULL THEN 'found'::TEXT
            WHEN lr_return.lost_id IS NOT NULL THEN 'lost'::TEXT
            WHEN n.matched_found_id IS NOT NULL THEN 'found'::TEXT
            WHEN n.matched_lost_id IS NOT NULL THEN 'lost'::TEXT
            ELSE NULL::TEXT
        END AS report_type,
        COALESCE(fr.found_id, lr_return.lost_id, n.matched_found_id, n.matched_lost_id) AS report_id,
        n.matched_found_id,
        n.matched_lost_id,
        COALESCE(fr.title, lr_return.title, mfr.title, mlr.title) AS item_title,
        COALESCE(fr.description, lr_return.description, mfr.description, mlr.description) AS item_description,
        COALESCE(fl.name, ll_return.name, mfl.name, mll.name) AS location_name,
        COALESCE(fr.found_at, lr_return.lost_at, mfr.found_at, mlr.lost_at) AS item_date,
        COALESCE(
            (SELECT fri.image_url
             FROM Found_Report_Images fri
             WHERE fri.found_id = COALESCE(fr.found_id, n.matched_found_id)
             ORDER BY fri.image_id
             LIMIT 1),
            (SELECT lri.image_url
             FROM Lost_Report_Images lri
             WHERE lri.lost_id = COALESCE(lr_return.lost_id, n.matched_lost_id)
             ORDER BY lri.image_id
             LIMIT 1)
        ) AS item_image_url,
        COALESCE(
            (SELECT ARRAY_AGG(fri.image_url)
             FROM Found_Report_Images fri
             WHERE fri.found_id = COALESCE(fr.found_id, n.matched_found_id)),
            (SELECT ARRAY_AGG(lri.image_url)
             FROM Lost_Report_Images lri
             WHERE lri.lost_id = COALESCE(lr_return.lost_id, n.matched_lost_id))
        ) AS item_image_urls,
        COALESCE(
            (SELECT ARRAY_AGG(cri.image_url)
             FROM Claim_Request_Images cri
             WHERE cri.claim_id = cr.claim_id),
            (SELECT ARRAY_AGG(rri.image_url)
             FROM Return_Request_Images rri
             WHERE rri.return_id = rr.return_id)
        ) AS requester_image_urls
    FROM Notification n
    LEFT JOIN Claim_Request cr ON n.claim_id = cr.claim_id
    LEFT JOIN Return_Request rr ON n.return_id = rr.return_id
    LEFT JOIN Users cu ON cr.requester_id = cu.user_id
    LEFT JOIN Users ru ON rr.requester_id = ru.user_id
    LEFT JOIN Found_Report fr ON cr.found_report_id = fr.found_id
    LEFT JOIN Lost_Report lr_return ON rr.lost_report_id = lr_return.lost_id
    LEFT JOIN Found_Report mfr ON n.matched_found_id = mfr.found_id
    LEFT JOIN Lost_Report mlr ON n.matched_lost_id = mlr.lost_id
    LEFT JOIN Location fl ON fr.found_location_id = fl.location_id
    LEFT JOIN Location ll_return ON lr_return.last_location_id = ll_return.location_id
    LEFT JOIN Location mfl ON mfr.found_location_id = mfl.location_id
    LEFT JOIN Location mll ON mlr.last_location_id = mll.location_id
    WHERE n.user_id = p_user_id
    ORDER BY n.created_at DESC, n.notification_id DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- CLAIM & RETURN REQUEST FUNCTIONS
-- ============================================

-- Get claims for my FOUND items
CREATE OR REPLACE FUNCTION get_user_claim_requests(p_user_id INT)
RETURNS TABLE (
    claim_id INT,
    requester_id INT,
    requester_name VARCHAR(100),
    found_report_id INT,
    item_title VARCHAR(50),
    message TEXT,
    claimed_at TIMESTAMP,
    status request_status_enum,
    image_urls TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cr.claim_id,
        cr.requester_id,
        u.name as requester_name,
        cr.found_report_id,
        fr.title as item_title,
        cr.message,
        cr.claimed_at,
        cr.status,
        ARRAY(SELECT cri.image_url FROM Claim_Request_Images cri WHERE cri.claim_id = cr.claim_id) as image_urls
    FROM Claim_Request cr
    JOIN Found_Report fr ON cr.found_report_id = fr.found_id
    JOIN Users u ON cr.requester_id = u.user_id
    WHERE fr.creator_id = p_user_id
    ORDER BY cr.claimed_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Get returns for my LOST items
CREATE OR REPLACE FUNCTION get_user_return_requests(p_user_id INT)
RETURNS TABLE (
    return_id INT,
    requester_id INT,
    requester_name VARCHAR(100),
    lost_report_id INT,
    item_title VARCHAR(50),
    message TEXT,
    returned_at TIMESTAMP,
    status request_status_enum,
    image_urls TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        rr.return_id,
        rr.requester_id,
        u.name as requester_name,
        rr.lost_report_id,
        lr.title as item_title,
        rr.message,
        rr.returned_at,
        rr.status,
        ARRAY(SELECT rri.image_url FROM Return_Request_Images rri WHERE rri.return_id = rr.return_id) as image_urls
    FROM Return_Request rr
    JOIN Lost_Report lr ON rr.lost_report_id = lr.lost_id
    JOIN Users u ON rr.requester_id = u.user_id
    WHERE lr.creator_id = p_user_id
    ORDER BY rr.returned_at DESC;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- PROFILE FUNCTIONS
-- ============================================

-- Get full user profile (joins Users + Auth)
CREATE OR REPLACE FUNCTION get_user_profile(p_user_id INT)
RETURNS TABLE (
    user_id INT,
    name VARCHAR(100),
    student_id NUMERIC(9, 0),
    contact_number BIGINT,
    email VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.user_id,
        u.name,
        u.student_id,
        u.contact_number,
        a.email
    FROM Users u
    JOIN Auth a ON a.user_id = u.user_id
    WHERE u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- Update editable profile fields (name + contact_number)
CREATE OR REPLACE FUNCTION update_user_profile(
    p_user_id INT,
    p_name VARCHAR(100),
    p_contact BIGINT
)
RETURNS VOID AS $$
BEGIN
    IF p_contact IS NOT NULL AND (p_contact < 1000000000 OR p_contact > 9999999999) THEN
        RAISE EXCEPTION 'Contact number must be a valid 10-digit number.';
    END IF;

    UPDATE Users
    SET
        name = COALESCE(p_name, name),
        contact_number = COALESCE(p_contact, contact_number)
    WHERE user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- USER REPORT HISTORY FUNCTION
-- ============================================

DROP FUNCTION IF EXISTS get_user_report_history(INT);

CREATE OR REPLACE FUNCTION get_user_report_history(p_user_id INT)
RETURNS TABLE (
    history_id      INT,
    report_type     TEXT,
    title           VARCHAR(50),
    description     TEXT,
    location_name   VARCHAR(100),
    reported_at     TIMESTAMP WITH TIME ZONE,
    status          TEXT,
    image_url       TEXT,
    category        TEXT,
    creator_name    TEXT,      
    creator_id      INT,
    creator_email   VARCHAR(255),
    creator_student_id NUMERIC(9, 0),
    creator_contact_number BIGINT
) AS $$
BEGIN
    RETURN QUERY

    -- Lost reports created by user (user IS the creator)
    SELECT
        lr.lost_id AS history_id,
        'lost'::TEXT AS report_type,
        lr.title,
        lr.description,
        l.name AS location_name,
        lr.lost_at AS reported_at,
        lr.status::TEXT AS status,
        (SELECT lri.image_url
         FROM Lost_Report_Images lri
         WHERE lri.lost_id = lr.lost_id
         ORDER BY lri.image_id LIMIT 1) AS image_url,
        (SELECT t.name
         FROM Tags t
         JOIN Lost_Report_Tags lrt ON lrt.category_id = t.tag_id
         WHERE lrt.lost_id = lr.lost_id
         ORDER BY t.tag_id LIMIT 1)::TEXT AS category,
        u.name::TEXT AS creator_name,
        u.user_id AS creator_id,
        a.email AS creator_email,
        u.student_id AS creator_student_id,
        u.contact_number AS creator_contact_number
    FROM Lost_Report lr
    JOIN Location l ON l.location_id = lr.last_location_id
    JOIN Users u ON u.user_id = lr.creator_id
    JOIN Auth a ON a.user_id = u.user_id
    WHERE lr.creator_id = p_user_id

    UNION ALL

    -- Found reports created by user (user IS the creator)
    SELECT
        fr.found_id AS history_id,
        'found'::TEXT AS report_type,
        fr.title,
        fr.description,
        l.name AS location_name,
        fr.found_at AS reported_at,
        fr.status::TEXT AS status,
        (SELECT fri.image_url
         FROM Found_Report_Images fri
         WHERE fri.found_id = fr.found_id
         ORDER BY fri.image_id LIMIT 1) AS image_url,
        (SELECT t.name
         FROM Tags t
         JOIN Found_Report_Tags frt ON frt.category_id = t.tag_id
         WHERE frt.found_id = fr.found_id
         ORDER BY t.tag_id LIMIT 1)::TEXT AS category,
        u.name::TEXT AS creator_name,
        u.user_id AS creator_id,
        a.email AS creator_email,
        u.student_id AS creator_student_id,
        u.contact_number AS creator_contact_number
    FROM Found_Report fr
    JOIN Location l ON l.location_id = fr.found_location_id
    JOIN Users u ON u.user_id = fr.creator_id
    JOIN Auth a ON a.user_id = u.user_id
    WHERE fr.creator_id = p_user_id

    UNION ALL

    -- Claim requests submitted by user → creator is the found report's poster
    SELECT
        cr.claim_id AS history_id,
        'claim'::TEXT AS report_type,
        fr.title,
        cr.message AS description,
        l.name AS location_name,
        cr.claimed_at AS reported_at,
        cr.status::TEXT AS status,
        (SELECT fri.image_url
         FROM Found_Report_Images fri
         WHERE fri.found_id = fr.found_id
         ORDER BY fri.image_id LIMIT 1) AS image_url,
        (SELECT t.name
         FROM Tags t
         JOIN Found_Report_Tags frt ON frt.category_id = t.tag_id
         WHERE frt.found_id = fr.found_id
         ORDER BY t.tag_id LIMIT 1)::TEXT AS category,
        u.name::TEXT AS creator_name,
        u.user_id AS creator_id,
        a.email AS creator_email,
        u.student_id AS creator_student_id,
        u.contact_number AS creator_contact_number
    FROM Claim_Request cr
    JOIN Found_Report fr ON fr.found_id = cr.found_report_id
    JOIN Location l ON l.location_id = fr.found_location_id
    JOIN Users u ON u.user_id = fr.creator_id
    JOIN Auth a ON a.user_id = u.user_id
    WHERE cr.requester_id = p_user_id

    UNION ALL

    -- Return requests submitted by user → creator is the lost report's poster
    SELECT
        rr.return_id AS history_id,
        'return'::TEXT AS report_type,
        lr.title,
        rr.message AS description,
        l.name AS location_name,
        rr.returned_at AS reported_at,
        rr.status::TEXT AS status,
        (SELECT lri.image_url
         FROM Lost_Report_Images lri
         WHERE lri.lost_id = lr.lost_id
         ORDER BY lri.image_id LIMIT 1) AS image_url,
        (SELECT t.name
         FROM Tags t
         JOIN Lost_Report_Tags lrt ON lrt.category_id = t.tag_id
         WHERE lrt.lost_id = lr.lost_id
         ORDER BY t.tag_id LIMIT 1)::TEXT AS category,
        u.name::TEXT AS creator_name,
        u.user_id AS creator_id,
        a.email AS creator_email,
        u.student_id AS creator_student_id,
        u.contact_number AS creator_contact_number
    FROM Return_Request rr
    JOIN Lost_Report lr ON lr.lost_id = rr.lost_report_id
    JOIN Location l ON l.location_id = lr.last_location_id
    JOIN Users u ON u.user_id = lr.creator_id
    JOIN Auth a ON a.user_id = u.user_id
    WHERE rr.requester_id = p_user_id

    ORDER BY reported_at DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;


-- FUNCTION to get filtered and sorted reports for the dashboard
DROP FUNCTION IF EXISTS get_dashboard_reports(TEXT, TEXT, TEXT, TEXT, TEXT, INT);

CREATE OR REPLACE FUNCTION get_dashboard_reports(
    p_search TEXT DEFAULT '',
    p_category TEXT DEFAULT 'all',
    p_location TEXT DEFAULT 'all',
    p_type TEXT DEFAULT 'all', -- 'all', 'lost', 'found', 'my-reports'
    p_sort_order TEXT DEFAULT 'newest', -- 'newest', 'oldest'
    p_current_user_id INT DEFAULT NULL
)
RETURNS TABLE (
    id TEXT,
    db_id INT,
    report_type TEXT,
    creator_id INT,
    user_name TEXT,
    user_email VARCHAR(255),
    user_student_id NUMERIC(9, 0),
    user_contact_number BIGINT,
    title VARCHAR(50),
    description TEXT,
    category TEXT,
    location_name VARCHAR(100),
    reported_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    status TEXT,
    image_url TEXT,
    image_urls TEXT[],
    tags TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        res.res_id,
        res.res_db_id,
        res.res_report_type,
        res.res_creator_id,
        res.res_user_name,
        res.res_user_email,
        res.res_user_student_id,
        res.res_user_contact_number,
        res.res_title,
        res.res_description,
        res.res_category,
        res.res_location_name,
        res.res_reported_at,
        res.res_created_at,
        res.res_status,
        res.res_image_url,
        res.res_image_urls,
        res.res_tags
    FROM (
        -- LOST REPORTS
        SELECT
            ('lost-' || lr.lost_id)::TEXT AS res_id,
            lr.lost_id::INT AS res_db_id,
            'lost'::TEXT AS res_report_type,
            lr.creator_id::INT AS res_creator_id,
            u.name::TEXT AS res_user_name,
            a.email::VARCHAR(255) AS res_user_email,
            u.student_id::NUMERIC(9, 0) AS res_user_student_id,
            u.contact_number::BIGINT AS res_user_contact_number,
            lr.title::VARCHAR(50) AS res_title,
            lr.description::TEXT AS res_description,
            COALESCE((
                SELECT t.name 
                FROM Tags t 
                JOIN Lost_Report_Tags lrt ON t.tag_id = lrt.category_id 
                WHERE lrt.lost_id = lr.lost_id 
                LIMIT 1
            )::TEXT, 'Other'::TEXT) AS res_category,
            l.name::VARCHAR(100) AS res_location_name,
            lr.lost_at::TIMESTAMPTZ AS res_reported_at,
            lr.created_at::TIMESTAMPTZ AS res_created_at,
            lr.status::TEXT AS res_status,
            (
                SELECT lri.image_url 
                FROM Lost_Report_Images lri 
                WHERE lri.lost_id = lr.lost_id 
                ORDER BY lri.image_id LIMIT 1
            )::TEXT AS res_image_url,
            ARRAY(
                SELECT lri.image_url 
                FROM Lost_Report_Images lri 
                WHERE lri.lost_id = lr.lost_id
            )::TEXT[] AS res_image_urls,
            ARRAY(
                SELECT t.name 
                FROM Tags t 
                JOIN Lost_Report_Tags lrt ON t.tag_id = lrt.category_id 
                WHERE lrt.lost_id = lr.lost_id
            )::TEXT[] AS res_tags,
            lr.status AS raw_status -- For internal filtering
        FROM Lost_Report lr
        JOIN Users u ON lr.creator_id = u.user_id
        JOIN Auth a ON u.user_id = a.user_id
        JOIN Location l ON lr.last_location_id = l.location_id

        UNION ALL

        -- FOUND REPORTS
        SELECT
            ('found-' || fr.found_id)::TEXT AS res_id,
            fr.found_id::INT AS res_db_id,
            'found'::TEXT AS res_report_type,
            fr.creator_id::INT AS res_creator_id,
            u.name::TEXT AS res_user_name,
            a.email::VARCHAR(255) AS res_user_email,
            u.student_id::NUMERIC(9, 0) AS res_user_student_id,
            u.contact_number::BIGINT AS res_user_contact_number,
            fr.title::VARCHAR(50) AS res_title,
            fr.description::TEXT AS res_description,
            COALESCE((
                SELECT t.name 
                FROM Tags t 
                JOIN Found_Report_Tags frt ON t.tag_id = frt.category_id 
                WHERE frt.found_id = fr.found_id 
                LIMIT 1
            )::TEXT, 'Other'::TEXT) AS res_category,
            l.name::VARCHAR(100) AS res_location_name,
            fr.found_at::TIMESTAMPTZ AS res_reported_at,
            fr.created_at::TIMESTAMPTZ AS res_created_at,
            fr.status::TEXT AS res_status,
            (
                SELECT fri.image_url 
                FROM Found_Report_Images fri 
                WHERE fri.found_id = fr.found_id 
                ORDER BY fri.image_id LIMIT 1
            )::TEXT AS res_image_url,
            ARRAY(
                SELECT fri.image_url 
                FROM Found_Report_Images fri 
                WHERE fri.found_id = fr.found_id
            )::TEXT[] AS res_image_urls,
            ARRAY(
                SELECT t.name 
                FROM Tags t 
                JOIN Found_Report_Tags frt ON t.tag_id = frt.category_id 
                WHERE frt.found_id = fr.found_id
            )::TEXT[] AS res_tags,
            fr.status AS raw_status -- For internal filtering
        FROM Found_Report fr
        JOIN Users u ON fr.creator_id = u.user_id
        JOIN Auth a ON u.user_id = a.user_id
        JOIN Location l ON fr.found_location_id = l.location_id
    ) res
    WHERE 
        res.raw_status NOT IN ('archived'::report_status_enum, 'completed'::report_status_enum)
        AND (p_search = '' OR res.res_title ILIKE '%' || p_search || '%' OR res.res_description ILIKE '%' || p_search || '%')
        AND (p_category = 'all' OR res.res_category = p_category)
        AND (p_location = 'all' OR res.res_location_name = p_location)
        AND (
            p_type = 'all' 
            OR (p_type = 'lost' AND res.res_report_type = 'lost')
            OR (p_type = 'found' AND res.res_report_type = 'found')
            OR (p_type = 'my-reports' AND res.res_creator_id = p_current_user_id)
        )
    ORDER BY 
        CASE WHEN p_sort_order = 'newest' THEN res.res_created_at END DESC,
        CASE WHEN p_sort_order = 'oldest' THEN res.res_created_at END ASC;
END;
$$ LANGUAGE plpgsql;
