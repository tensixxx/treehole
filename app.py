from flask import Flask, render_template, request, redirect, url_for, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import os

app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get("DATABASE_URL", "sqlite:///treehole.db")
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)

class Visit(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    count = db.Column(db.Integer, default=0)

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    likes = db.Column(db.Integer, default=0)

class LikeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_ip = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_ip', name='unique_like_per_user_per_post'),
    )

with app.app_context():
    db.create_all()

@app.route("/")
def index():
    visit = Visit.query.first()
    if not visit:
        visit = Visit(count=1)
        db.session.add(visit)
    else:
        visit.count += 1
    db.session.commit()

    posts = Post.query.order_by(Post.created_at.desc()).all()
    return render_template("index.html", posts=posts, visit_count=visit.count)

@app.route("/add", methods=["POST"])
def add_post():
    content = request.form.get("content")
    if content:
        new_post = Post(content=content)
        db.session.add(new_post)
        db.session.commit()
    return redirect(url_for("index"))

@app.route('/like/<int:post_id>', methods=['POST'])
def like_post(post_id):
    user_ip = request.remote_addr
    existing_like = LikeLog.query.filter_by(post_id=post_id, user_ip=user_ip).first()
    if existing_like:
        return jsonify({'success': False, 'message': 'Already liked'})
    
    post = Post.query.get_or_404(post_id)
    post.likes += 1
    db.session.add(LikeLog(post_id=post_id, user_ip=user_ip))
    db.session.commit()
    return jsonify({'success': True, 'likes': post.likes})

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)


#How to run
#python -m venv venv
#venv\Scripts\activate
#pip install flask flask_sqlalchemy
#python app.py
