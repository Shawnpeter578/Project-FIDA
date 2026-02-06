# Data Scheme Analysis

## 1. Users Collection (`users`)

### Current Schema
Based on `src/auth_path.js`, the user document currently contains:

```json
{
  "_id": "ObjectId(...)",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://...",
  "lastLogin": "ISODate(...)",
  "joinedEvents": ["ObjectId(EventID1)", "ObjectId(EventID2)"],
  "createdAt": "ISODate(...)"
}
```

### Proposed Schema (Role-Based)
To support the new problem statement (Roles: artist, user, organizer), we need to add a `role` field.

```json
{
  "_id": "ObjectId(...)",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "https://...",
  "role": "user",  // Enum: "user" | "artist" | "organizer"
  "lastLogin": "ISODate(...)",
  "joinedEvents": ["ObjectId(...)"], // For "user" role (and maybe others)
  "appliedEvents": ["ObjectId(...)"], // NEW: For "artist" role
  "organizedEvents": ["ObjectId(...)"], // NEW (Optional): For "organizer" role, or just query by creatorId
  "createdAt": "ISODate(...)"
}
```

**Field Details:**
*   **role**: 
    *   `user`: Standard consumer. Can join events.
    *   `organizer`: Can create/post events.
    *   `artist`: Can apply to perform at events.

---

## 2. Events Collection (`events`)

### Current Schema
Based on `src/event_path.js`:

```json
{
  "_id": "ObjectId(...)",
  "title": "Concert",
  "description": "...",
  "date": "2023-12-25",
  "time": "20:00",
  "location": "Venue",
  "category": "Music",
  "maxAttendees": 100,
  "mode": "offline",
  "price": 10.0,
  "image": "https://...",
  "creatorId": "ObjectId(UserID)", // The organizer
  "creatorName": "Organizer Name",
  "attendees": ["ObjectId(UserID)"],
  "comments": [
    {
      "_id": "ObjectId(...)",
      "userId": "ObjectId(...)",
      "userName": "Name",
      "text": "Comment text",
      "timestamp": "ISODate(...)"
    }
  ],
  "createdAt": "ISODate(...)",
  "checkedIn": []
}
```

### Proposed Schema (Artist Integration)
Events need to know if they accept artists and who has applied.

```json
{
  "_id": "ObjectId(...)",
  // ... existing fields ...
  "allowArtistApplications": true, // NEW: Boolean. Only set by 'organizer'.
  "artistApplications": [          // NEW: List of artists who applied
    {
      "artistId": "ObjectId(...)",
      "artistName": "Artist Name",
      "status": "pending", // Enum: "pending" | "accepted" | "rejected"
      "appliedAt": "ISODate(...)"
    }
  ],
  "confirmedArtists": ["ObjectId(...)"] // NEW: List of accepted artists
}
```

---

## 3. Privilege & Interaction Model

| Actor | Action | Endpoint | Pre-requisite |
| :--- | :--- | :--- | :--- |
| **Organizer** | Create Event | `POST /api/events` | `user.role === 'organizer'` |
| **User** | Join Event | `POST /api/events/join` | `user.role === 'user'` (or 'artist'/'organizer' acting as user?) |
| **Artist** | Apply to Event | `POST /api/events/apply` | `user.role === 'artist'` AND `event.allowArtistApplications === true` |
| **Organizer** | Approve Artist | `PUT /api/events/:id/artists` | `user._id === event.creatorId` |

