# Firestore Setup Quick Guide

## Quick Start: What to Create in Firestore Console

### Option 1: Let Your Backend Create Everything (Recommended)

**Just enable Firestore** - Your backend will automatically create all collections and documents when you use the API endpoints!

Steps:
1. Go to Firebase Console → Firestore Database
2. Click "Create database"
3. Choose "Start in production mode" (you can add security rules later)
4. Select a location for your database
5. Click "Enable"
6. Done! Your backend will create collections automatically

---

### Option 2: Create Collections Manually

If you want to see the structure first, follow these steps:

## Step-by-Step: Create Collections

### 1. Create `users` Collection

**In Firestore Console:**
1. Click "Start collection" (or "+ Add collection")
2. **Collection ID:** `users`
3. Click "Next"
4. **Document ID:** Click "Auto-ID" (let Firestore generate it)
5. **Add Fields:**
   - Field: `name`, Type: `string`, Value: `"John Doe"`
   - Field: `email`, Type: `string`, Value: `"john@example.com"`
   - Field: `age`, Type: `number`, Value: `25` (or leave empty)
6. Click "Save"

**Done!** You now have a `users` collection with one document.

---

### 2. Create `question_answers` Subcollection

**In Firestore Console:**
1. Open your `users` collection
2. Click on a user document (or create one if you haven't)
3. You'll see "Start subcollection" link - click it
4. **Collection ID:** `question_answers`
5. Click "Next"
6. **Document ID:** Click "Auto-ID"
7. **Add Fields:**
   - Field: `email`, Type: `string`, Value: `"john@example.com"`
   - Field: `answers`, Type: `array`, Value: Add array items:
     - Click "+ Add item"
     - Type: `map` (object)
     - Inside the map, add:
       - `question_id`: `string`, Value: `"name"`
       - `question_text`: `string`, Value: `"What is your name?"`
       - `answer`: `string`, Value: `"John Doe"`
     - Add more items for other questions
   - Field: `submitted_at`, Type: `timestamp`, Value: Click "Set to now"
8. Click "Save"

**Or:** Just let your backend create this automatically when users submit answers!

---

### 3. Create `home` Collection

**In Firestore Console:**
1. Click "+ Add collection"
2. **Collection ID:** `home`
3. Click "Next"
4. **Document ID:** Click "Auto-ID"
5. **Add Fields:**
   - Field: `user_id`, Type: `string`, Value: `"<paste a user_id from users collection>"`
   - Field: `user_profile`, Type: `map`, Value: Add nested fields:
     - `name`: `string`, `"John Doe"`
     - `primary_language`: `string`, `"Python"`
     - `tech_stack`: `array`, Add items like `"React"`, `"Node.js"`
     - `weak_areas`: `array`, Add items like `"Dynamic Programming"`
     - `target_companies`: `array`, Add items like `"Google"`
     - Add other profile fields as needed
   - Field: `search_queries`, Type: `array`, Value: Add strings like `"Python tutorial"`
   - Field: `total_resources`, Type: `number`, Value: `0`
   - Field: `resources`, Type: `map`, Value: Add categories:
     - `weak_areas_improvement`: `array` (empty or with resource objects)
     - `interview_preparation`: `array` (empty or with resource objects)
     - `skill_development`: `array` (empty or with resource objects)
     - `practice_problems`: `array` (empty or with resource objects)
     - `technology_tutorials`: `array` (empty or with resource objects)
     - `general_learning`: `array` (empty or with resource objects)
   - Field: `generated_at`, Type: `string`, Value: `"2024-01-15T10:30:00Z"`
   - Field: `created_at`, Type: `timestamp`, Value: Click "Set to now"
6. Click "Save"

**Or:** Just let your backend create this automatically when you call `/generate-resources`!

---

## Minimal Setup (What You Actually Need to Do)

### For Development:

**Just enable Firestore** - that's it!

1. Firebase Console → Firestore Database
2. Click "Create database"
3. Select "Start in test mode" (for development)
4. Choose location
5. Click "Enable"

Your backend will create all collections and documents automatically when you:
- Create a user → creates document in `users`
- Submit answers → creates document in `question_answers` subcollection
- Generate resources → creates document in `home`

---

## Sample Document Structures (Copy-Paste Reference)

### Sample User Document

```
Collection: users
Document ID: auto-generated

Fields:
├── name: "John Doe" (string)
├── email: "john@example.com" (string)
└── age: 25 (number, optional)
```

### Sample Question Answers Document

```
Collection: users/{userId}/question_answers
Document ID: auto-generated

Fields:
├── email: "john@example.com" (string)
├── answers: [array of maps]
│   └── Each map contains:
│       ├── question_id: "name" (string)
│       ├── question_text: "What is your name?" (string)
│       └── answer: "John Doe" (string)
└── submitted_at: [timestamp]
```

### Sample Home Document

```
Collection: home
Document ID: auto-generated

Fields:
├── user_id: "abc123" (string)
├── user_profile: {map}
├── search_queries: ["query1", "query2"] (array of strings)
├── total_resources: 45 (number)
├── resources: {map with 6 category arrays}
├── generated_at: "2024-01-15T10:30:00Z" (string)
└── created_at: [timestamp]
```

---

## Testing Your Setup

After enabling Firestore:

1. **Test User Creation:**
   ```bash
   POST http://localhost:8000/users
   Body: {
     "name": "Test User",
     "email": "test@example.com",
     "age": 25
   }
   ```
   Check Firestore → `users` collection should have a new document

2. **Test Answer Submission:**
   ```bash
   POST http://localhost:8000/users/test@example.com/answers
   Body: {
     "email": "test@example.com",
     "answers": [
       {
         "question_id": "name",
         "question_text": "What is your name?",
         "answer": "Test User"
       }
     ]
   }
   ```
   Check Firestore → `users/{userId}/question_answers` should have a new document

3. **Test Resource Generation:**
   ```bash
   POST http://localhost:8000/generate-resources-by-email/test@example.com
   ```
   Check Firestore → `home` collection should have a new document

---

## Common Issues & Solutions

### Issue: "Collection doesn't exist"
**Solution:** Firestore creates collections automatically when you add the first document. Just enable Firestore and use your API endpoints.

### Issue: "Permission denied"
**Solution:** Make sure Firestore is in "test mode" for development, or set up proper security rules.

### Issue: "Index needed"
**Solution:** Firestore will show you a link to create the index. Click it, wait a few minutes, and try again.

### Issue: "Firestore API not enabled"
**Solution:** Go to Firebase Console → Project Settings → APIs and enable "Cloud Firestore API".

---

## Recommended Development Workflow

1. ✅ Enable Firestore in Firebase Console
2. ✅ Set to "test mode" for development
3. ✅ Run your backend server
4. ✅ Use API endpoints - collections will be created automatically
5. ✅ Monitor Firestore Console to see data being created
6. ✅ Set up security rules when ready for production

---

## Need Help?

- Check `FIRESTORE_SCHEMA.md` for detailed schema documentation
- Check Firestore Console → Data tab to see your data
- Check backend logs for any Firestore errors
- Firebase docs: https://firebase.google.com/docs/firestore
