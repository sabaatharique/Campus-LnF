-- ============================================
-- REPORT CREATION PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE create_lost_report(
    p_creator_id INT,
    p_last_location_id INT,
    p_title VARCHAR(50),
    p_description TEXT,
    p_lost_at TIMESTAMP,
    p_tags INT[],
    p_image_urls TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_lost_id INT;
    tag_id INT;
    image_url TEXT;
BEGIN
    -- Insert main lost report
    INSERT INTO Lost_Report (
        creator_id, last_location_id, title, description, lost_at, status
    )
    VALUES (
        p_creator_id, p_last_location_id, p_title, p_description, p_lost_at, 'active'
    )
    RETURNING lost_id INTO new_lost_id;

    -- Insert tags
    FOREACH tag_id IN ARRAY p_tags
    LOOP
        INSERT INTO Lost_Report_Tags (lost_id, category_id)
        VALUES (new_lost_id, tag_id);
    END LOOP;

    -- Insert images
    FOREACH image_url IN ARRAY p_image_urls
    LOOP
        INSERT INTO Lost_Report_Images (lost_id, image_url)
        VALUES (new_lost_id, image_url);
    END LOOP;

    -- Auto-Match Logic
    -- Find any active Found_Reports at the same location that share AT LEAST ONE tag
    INSERT INTO Notification (user_id, matched_lost_id, message, created_at)
    SELECT DISTINCT
        fr.creator_id,
        new_lost_id,
        'A newly lost item might match your found item: ' || p_title,
        NOW()
    FROM Found_Report fr
    JOIN Found_Report_Tags frt ON fr.found_id = frt.found_id
    WHERE fr.found_location_id = p_last_location_id
      AND fr.status = 'active'
      AND frt.category_id = ANY(p_tags);

END;
$$;

CREATE OR REPLACE PROCEDURE create_found_report(
    p_creator_id INT,
    p_found_location_id INT,
    p_title VARCHAR(50),
    p_description TEXT,
    p_found_at TIMESTAMP,
    p_tags INT[],
    p_image_urls TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    new_found_id INT;
    tag_id INT;
    image_url TEXT;
BEGIN
    -- Insert main found report
    INSERT INTO Found_Report (
        creator_id, found_location_id, title, description, found_at, status
    )
    VALUES (
        p_creator_id, p_found_location_id, p_title, p_description, p_found_at, 'active'
    )
    RETURNING found_id INTO new_found_id;

    -- Insert tags
    FOREACH tag_id IN ARRAY p_tags
    LOOP
        INSERT INTO Found_Report_Tags (found_id, category_id)
        VALUES (new_found_id, tag_id);
    END LOOP;

    -- Insert images
    FOREACH image_url IN ARRAY p_image_urls
    LOOP
        INSERT INTO Found_Report_Images (found_id, image_url)
        VALUES (new_found_id, image_url);
    END LOOP;

    -- Auto-Match Logic
    -- Find any active Lost_Reports at the same location that share AT LEAST ONE tag
    INSERT INTO Notification (user_id, matched_found_id, message, created_at)
    SELECT DISTINCT
        lr.creator_id,
        new_found_id,
        'A newly found item might match your lost item: ' || p_title,
        NOW()
    FROM Lost_Report lr
    JOIN Lost_Report_Tags lrt ON lr.lost_id = lrt.lost_id
    WHERE lr.last_location_id = p_found_location_id
      AND lr.status = 'active'
      AND lrt.category_id = ANY(p_tags);

END;
$$;


-- ============================================
-- CLAIM REQUEST PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE create_claim_request_found(
    p_requester_id INT,
    p_found_report_id INT,
    p_message TEXT,
    p_image_urls TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_claim_id INT;
    v_found_creator_id INT;
    v_item_title VARCHAR(50);
    v_requester_name VARCHAR(100);
    image_url TEXT;
BEGIN
    -- Get the creator of the found report and item title
    SELECT creator_id, title INTO v_found_creator_id, v_item_title
    FROM Found_Report
    WHERE found_id = p_found_report_id;

    -- Get requester name
    SELECT name INTO v_requester_name
    FROM Users
    WHERE user_id = p_requester_id;

    -- Insert claim request
    INSERT INTO Claim_Request (
        requester_id, 
        found_report_id, 
        message, 
        claimed_at, 
        status
    )
    VALUES (
        p_requester_id, 
        p_found_report_id, 
        p_message, 
        NOW(), 
        'pending'
    )
    RETURNING claim_id INTO v_claim_id;

    -- Insert images
    FOREACH image_url IN ARRAY COALESCE(p_image_urls, ARRAY[]::TEXT[])
    LOOP
        INSERT INTO Claim_Request_Images (claim_id, image_url)
        VALUES (v_claim_id, image_url);
    END LOOP;

END;
$$;

CREATE OR REPLACE PROCEDURE create_return_request_lost(
    p_requester_id INT,
    p_lost_report_id INT,
    p_message TEXT,
    p_image_urls TEXT[]
)
LANGUAGE plpgsql
AS $$
DECLARE
    v_lost_creator_id INT;
    v_item_title VARCHAR(50);
    v_requester_name VARCHAR(100);
    v_return_id INT;
    image_url TEXT;
BEGIN
    -- Get the creator of the lost report and item title
    SELECT creator_id, title INTO v_lost_creator_id, v_item_title
    FROM Lost_Report
    WHERE lost_id = p_lost_report_id;

    -- Get requester name
    SELECT name INTO v_requester_name
    FROM Users
    WHERE user_id = p_requester_id;

    -- Insert claim request for lost item
    INSERT INTO Return_Request (
        requester_id, 
        lost_report_id, 
        message, 
        returned_at, 
        status
    )
    VALUES (
        p_requester_id, 
        p_lost_report_id, 
        p_message, 
        NOW(), 
        'pending'
    )
    RETURNING return_id INTO v_return_id;

    -- Insert images
    FOREACH image_url IN ARRAY COALESCE(p_image_urls, ARRAY[]::TEXT[])
    LOOP
        INSERT INTO Return_Request_Images (return_id, image_url)
        VALUES (v_return_id, image_url);
    END LOOP;

END;
$$;


-- ============================================
-- NOTIFICATION PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE delete_notification(p_notification_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    DELETE FROM Notification WHERE notification_id = p_notification_id;
END;
$$;

CREATE OR REPLACE PROCEDURE mark_notification_as_read(
    p_notification_id INT,
    p_user_id INT
)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Notification
    SET
        is_read = TRUE,
        read_at = COALESCE(read_at, NOW())
    WHERE notification_id = p_notification_id
      AND user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notification not found for this user.';
    END IF;
END;
$$;


-- ============================================
-- CLAIM & RETURN ACTION PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE accept_claim_request(p_claim_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id INT;
    v_found_id INT;
    v_item_title VARCHAR(50);
    v_owner_name VARCHAR(100);
BEGIN
    -- Get request details
    SELECT requester_id, found_report_id INTO v_requester_id, v_found_id
    FROM Claim_Request
    WHERE claim_id = p_claim_id;

    -- Update request status
    UPDATE Claim_Request SET status = 'accepted' WHERE claim_id = p_claim_id;

    -- Update report status and get title/owner
    IF v_found_id IS NOT NULL THEN
        UPDATE Found_Report SET status = 'completed' WHERE found_id = v_found_id;
        SELECT fr.title, u.name INTO v_item_title, v_owner_name 
        FROM Found_Report fr JOIN Users u ON fr.creator_id = u.user_id WHERE found_id = v_found_id;
    END IF;

END;
$$;

CREATE OR REPLACE PROCEDURE reject_claim_request(p_claim_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    -- Update request status
    UPDATE Claim_Request SET status = 'rejected' WHERE claim_id = p_claim_id;
END;
$$;

CREATE OR REPLACE PROCEDURE accept_return_request(p_return_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id INT;
    v_lost_id INT;
    v_item_title VARCHAR(50);
    v_owner_name VARCHAR(100);
BEGIN
    -- Get request details
    SELECT requester_id, lost_report_id INTO v_requester_id, v_lost_id
    FROM Return_Request
    WHERE return_id = p_return_id;

    -- Update request status
    UPDATE Return_Request SET status = 'accepted' WHERE return_id = p_return_id;

    -- Update report status
    UPDATE Lost_Report SET status = 'completed' WHERE lost_id = v_lost_id;

    -- Get item details
    SELECT lr.title, u.name INTO v_item_title, v_owner_name 
    FROM Lost_Report lr JOIN Users u ON lr.creator_id = u.user_id WHERE lr.lost_id = v_lost_id;

END;
$$;

CREATE OR REPLACE PROCEDURE reject_return_request(p_return_id INT)
LANGUAGE plpgsql
AS $$
DECLARE
    v_requester_id INT;
    v_item_title VARCHAR(50);
    v_owner_name VARCHAR(100);
BEGIN
    -- Get request details
    SELECT rr.requester_id, lr.title, u.name 
    INTO v_requester_id, v_item_title, v_owner_name
    FROM Return_Request rr
    JOIN Lost_Report lr ON rr.lost_report_id = lr.lost_id
    JOIN Users u ON lr.creator_id = u.user_id
    WHERE rr.return_id = p_return_id;

    -- Update request status
    UPDATE Return_Request SET status = 'rejected' WHERE return_id = p_return_id;

END;
$$;


-- ============================================
-- ARCHIVE PROCEDURES
-- ============================================

CREATE OR REPLACE PROCEDURE archive_lost_report(p_lost_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Lost_Report
    SET status = 'archived'
    WHERE lost_id = p_lost_id;
END;
$$;

CREATE OR REPLACE PROCEDURE archive_found_report(p_found_id INT)
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE Found_Report
    SET status = 'archived'
    WHERE found_id = p_found_id;
END;
$$;

-- ============================================
-- AUTO-ARCHIVE PROCEDURE 
-- ============================================
CREATE OR REPLACE PROCEDURE auto_archive_inactive_reports()
LANGUAGE plpgsql
AS $$
DECLARE
    -- Explicit cursor for lost reports
    lost_cursor CURSOR FOR
        SELECT lost_id FROM Lost_Report
        WHERE status = 'active'
          AND created_at <= NOW() - INTERVAL '1 month'
          AND NOT EXISTS (SELECT 1 FROM Return_Request WHERE lost_report_id = Lost_Report.lost_id);
    v_lost_id INT;

    -- Explicit cursor for found reports
    found_cursor CURSOR FOR
        SELECT found_id FROM Found_Report
        WHERE status = 'active'
          AND created_at <= NOW() - INTERVAL '1 month'
          AND NOT EXISTS (SELECT 1 FROM Claim_Request WHERE found_report_id = Found_Report.found_id);
    v_found_id INT;
BEGIN
    -- Process lost reports
    OPEN lost_cursor;
    LOOP
        FETCH lost_cursor INTO v_lost_id;
        EXIT WHEN NOT FOUND;

        BEGIN
            UPDATE Lost_Report SET status = 'archived' WHERE lost_id = v_lost_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error archiving lost report %: %', v_lost_id, SQLERRM;
        END;
    END LOOP;
    CLOSE lost_cursor;

    -- Process found reports
    OPEN found_cursor;
    LOOP
        FETCH found_cursor INTO v_found_id;
        EXIT WHEN NOT FOUND;

        BEGIN
            UPDATE Found_Report SET status = 'archived' WHERE found_id = v_found_id;
        EXCEPTION
            WHEN OTHERS THEN
                RAISE NOTICE 'Error archiving found report %: %', v_found_id, SQLERRM;
        END;
    END LOOP;
    CLOSE found_cursor;
END;
$$;