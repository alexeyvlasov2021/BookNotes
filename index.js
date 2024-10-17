import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import axios from "axios";

const app = express();
const port = 3000;

const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "bookNotes",
    password: "Vag007gt",
    port: 5432
  });

await db.connect();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));

async function getImgUrl(title){
    const requestString = title.replaceAll(" ", "+").toLowerCase();
    
    let img_link;

    try{
        const result = await axios.get(`https://www.googleapis.com/books/v1/volumes?q=intitle:${requestString}&printType=books`);

        if(result.data.items && result.data.items.length && result.status === 200){
            img_link = result.data.items[0].volumeInfo.imageLinks.thumbnail;
        }
        else{
            throw new Error("not valid image data received");
        }
        
    }
    catch(error){
        img_link = "stop.jpg"
        console.error(error);
    }
    

    return img_link;
}

app.get("/", async (req, res)=>{
    const result = await db.query("SELECT * FROM books ORDER BY id ASC");
    const books = result.rows;
    res.render("index.ejs", {books});
})

app.get("/view", async (req, res)=>{
    let {id} = req.query;
    id = Number(id);

    try{
        const result = await db.query("SELECT books.id, title, description, notes.id AS notes_id, note FROM books LEFT JOIN notes ON books.id = notes.book_id WHERE books.id = $1;", [id]);
        
        if(!result){
            throw new Error("data is not found");
        }
        
        const data = result.rows;
        res.render("book.ejs", {data});
    }
    catch(e){
        console.error(e);
        res.redirect("/");
    }
    
})

app.post("/add", async (req, res) =>{
    const {bookId, noteText} = req.body;

    try{
        await db.query("INSERT INTO notes (note, book_id) VALUES ($1, $2)", [noteText, bookId]) 
    }
    catch(e){
        console.error(e);
    }
    finally{
        res.redirect(`/view?id=${bookId}`);
    }
    
})

app.post("/update", async (req, res)=>{
    const {title, description, bookId} = req.body;
    const imgUrl = await getImgUrl(title);
    try{
        await db.query("UPDATE books SET title = $1, description = $2, img = $3 WHERE id = $4;",[title, description, imgUrl, bookId]);
    }
    catch(e){
        console.error(e);
    }
    finally{
        res.redirect(`/view?id=${bookId}`);
    }
})

app.post("/newTitle", async (req, res)=>{
    const{title, description} = req.body;
    const imgUrl = await getImgUrl(title);

    try{
        await db.query("INSERT INTO books (title, description, img) VALUES ($1, $2, $3)", [title, description, imgUrl]);
    }
    catch(e){
        console.error(e);
    }
    finally{
        res.redirect("/");
    }
    
})

app.post("/delete", async(req, res)=>{
    let {bookId} = req.body;
    bookId = Number(bookId);
    try{
        await db.query("DELETE FROM notes WHERE book_id = $1;", [bookId]);
        await db.query("DELETE FROM books WHERE id = $1;", [bookId]);
    }
    catch(e){
        console.error(e);
    }
    finally{
        res.redirect("/");
    }

})

app.post("/deleteNote", async(req, res)=>{
    const {bookId, notesId} = req.body;

    try{
        await db.query("DELETE FROM notes WHERE id = $1;", [notesId]);
    }
    catch(e){
        console.error(e);
    }
    finally{
        res.redirect(`/view?id=${bookId}`);
    }
    
})

app.get("/new", (req,res)=>{
    res.render("new.ejs");
})

app.listen(port, ()=>{
    console.log(`listening port ${port}`);
})