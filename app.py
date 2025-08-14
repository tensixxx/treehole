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
    user_ip = db.Column(db.String(100), nullable=False)

class LikeLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    user_ip = db.Column(db.String(100), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint('post_id', 'user_ip', name='unique_like_per_user_per_post'),
    )

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    post = db.relationship('Post', backref=db.backref('comments', lazy=True))

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

    # 分页逻辑
    page = request.args.get('page', 1, type=int)  # 获取页码，默认 1
    per_page = 20  # 每页显示 20 条
    pagination = Post.query.order_by(Post.created_at.desc()).paginate(page=page, per_page=per_page, error_out=False)
    posts = pagination.items

    return render_template(
        "index.html",
        posts=posts,
        visit_count=visit.count,
        user_ip=request.remote_addr,
        pagination=pagination
    )

@app.route("/add", methods=["POST"])
def add_post():
    data = request.get_json()
    content = data.get("content", "").strip()
    if not content:
        return jsonify({"success": False, "message": "内容不能为空"}), 400
    user_ip = request.remote_addr
    new_post = Post(content=content, user_ip=user_ip)
    db.session.add(new_post)
    db.session.commit()
    return jsonify({
        "success": True,
        "id": new_post.id,
        "number": Post.query.count(),
        "content": new_post.content,
        "created_at": new_post.created_at.strftime("%Y-%m-%d %H:%M:%S")
    })

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

@app.route('/comment/<int:post_id>', methods=['POST'])
def add_comment(post_id):
    data = request.get_json()
    content = data.get('comment', '').strip()
    if content:
        comment = Comment(post_id=post_id, content=content)
        db.session.add(comment)
        db.session.commit()
        return jsonify({"success": True, "comment": content})
    return jsonify({"success": False, "message": "Empty comment"}), 400

@app.route('/comment/<int:post_id>', methods=['GET'])
def get_comments(post_id):
    post = Post.query.get_or_404(post_id)
    comments = [
        {
            "content": c.content,
            "created_at": c.created_at.strftime("%Y-%m-%d %H:%M")
        }
        for c in post.comments
    ]
    return jsonify(comments)

@app.route('/delete/<int:post_id>', methods=['POST'])
def delete_post(post_id):
    post = Post.query.get_or_404(post_id)
    if post.user_ip != request.remote_addr:
        return "Unauthorized", 403
    db.session.delete(post)
    db.session.commit()
    return redirect(url_for('index'))

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=True)
