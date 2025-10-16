DELETE FROM inspection_images;

DELETE FROM inspections;

DELETE FROM assignments;

DELETE FROM properties;

ALTER SEQUENCE IF EXISTS properties_property_number_seq RESTART WITH 1;
