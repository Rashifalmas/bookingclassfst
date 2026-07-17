/*
# Seed Demo Room Data

Inserts sample rooms for the Booking Class FST demo.
These rooms cover floors Lt.3 through Lt.5 and Lab Terpadu,
with various capacities and facilities matching the SKPL mockups.
*/

INSERT INTO room_facilities (room_code, room_name, capacity, floor, facilities)
VALUES
  ('A.301', 'Ruang Kuliah A.301', 60, 'Lt.3', ARRAY['Projector', 'AC', 'Whiteboard']),
  ('A.302', 'Ruang Kuliah A.302', 45, 'Lt.3', ARRAY['Projector', 'AC', 'Whiteboard']),
  ('B.101', 'Ruang Seminar B.101', 80, 'Lt.1', ARRAY['Projector', 'AC', 'Sound System', 'Whiteboard']),
  ('B.510', 'Ruang B.510', 40, 'Lt.5', ARRAY['Projector', 'AC', 'Smart TV']),
  ('C.101', 'Ruang Kuliah C.101', 50, 'Lt.1', ARRAY['Projector', 'AC', 'Whiteboard']),
  ('C.202', 'Lab Komputer C.202', 40, 'Lt.2', ARRAY['Projector', 'AC', 'PC', 'Internet']),
  ('C.305', 'Ruang C.305', 35, 'Lt.3', ARRAY['Projector', 'AC']),
  ('D.401', 'Aula Kecil D.401', 100, 'Lt.4', ARRAY['Projector', 'AC', 'Sound System', 'Whiteboard']),
  ('LAB.1', 'Laboratorium Terpadu 1', 30, 'Lab Terpadu', ARRAY['PC', 'Projector', 'AC', 'Internet']),
  ('LAB.2', 'Laboratorium Terpadu 2', 30, 'Lab Terpadu', ARRAY['PC', 'Projector', 'AC', 'Internet']),
  ('A.405', 'Ruang A.405', 50, 'Lt.4', ARRAY['Projector', 'AC', 'Whiteboard']),
  ('A.512', 'Ruang A.512', 45, 'Lt.5', ARRAY['Projector', 'AC', 'Smart TV', 'Whiteboard'])
ON CONFLICT (room_code) DO NOTHING;
