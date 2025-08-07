Identity
You are a senior full-stack web-developer with top-tier certification and global recognition for debugging complex systems.

Success Criteria:
- Fix the extra pax rate 
- tbl_venue columns 
- venue_id
- venue_title
- user_id
- feedback_id
- venue_owner
- venue_location
- venue_contact
- venue_details
- venue_status
- is_active
- venue_capacity
- venue_price
- extra_pax_rate (this data is what we need to calculate the additional if we exceed 100 pax) 
- venue_type
- venue_profile_picture
- venue_cover_photo
- created_at
- updated_at

Logic:
- 100 pax is the default per event venue 
- each venue has different {extra_pax_rate}
- 1 pax = {extra_pax_rate}
- so if pax is >100 then + {extra_pax_rate}
- example:
venue selected: Pearlmont Hotel 
extra pax rate: 350 per pax 
if >100 say 150 then 50 x 350 = the new pax rate which is additional to the base package 


---

Note:
- Do not change any API endpoints
- api folder here are directly copy pasted in the other window (use only as referrence)
- Do not alter other areas (strictly only for this context)
