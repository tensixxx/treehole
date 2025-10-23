from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import psycopg2

app = Flask(__name__)

# === 数据库配置（Railway PostgreSQL） ===
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:oRGFlMqTEqKgbOMtZeSYqXHgpjUCsWJN@postgres.railway.internal:5432/railway'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# === 数据表定义 ===
class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    number = db.Column(db.Integer, unique=True)
    content = db.Column(db.Text, nullable=False)
    likes = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# === 首页显示 ===
@app.route('/')
def index():
    page = int(request.args.get('page', 1))
    per_page = 5
    pagination = Post.query.order_by(Post.id.desc()).paginate(page=page, per_page=per_page)
    posts = []
    for post in pagination.items:
        comments_count = Comment.query.filter_by(post_id=post.id).count()
        posts.append({
            'id': post.id,
            'number': post.number,
            'content': post.content,
            'likes': post.likes,
            'created_at': post.created_at.isoformat(),
            'comments_count': comments_count
        })
    if request.args.get('ajax') == '1':
        return jsonify({
            'posts': posts,
            'has_next': pagination.has_next,
            'next_page': pagination.next_num
        })
    return render_template('index.html', posts=posts, pagination=pagination, visit_count=Post.query.count())

# === 新增投稿 ===
@app.route('/add', methods=['POST'])
def add_post():
    content = request.json.get('content', '').strip()
    if not content:
        return jsonify({'error': 'Empty content'}), 400

    number = (db.session.query(db.func.max(Post.number)).scalar() or 0) + 1
    new_post = Post(number=number, content=content)
    db.session.add(new_post)
    db.session.commit()

    return jsonify({
        'id': new_post.id,
        'number': new_post.number,
        'content': new_post.content,
        'likes': new_post.likes,
        'created_at': new_post.created_at.isoformat()
    })

# === 点赞 ===
@app.route('/like/<int:post_id>', methods=['POST'])
def like_post(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify({'success': False, 'message': 'Post not found'})
    post.likes += 1
    db.session.commit()
    return jsonify({'success': True, 'likes': post.likes})

# === 评论 ===
@app.route('/comment/<int:post_id>', methods=['GET', 'POST'])
def comment(post_id):
    post = Post.query.get(post_id)
    if not post:
        return jsonify([])

    if request.method == 'POST':
        content = request.json.get('comment', '').strip()
        if not content:
            return jsonify({'error': 'Empty comment'}), 400
        new_comment = Comment(post_id=post.id, content=content)
        db.session.add(new_comment)
        db.session.commit()
        return jsonify({'comment': content})
    else:
        comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.id.asc()).all()
        return jsonify([{'content': c.content, 'created_at': c.created_at.strftime('%Y-%m-%d %H:%M:%S')} for c in comments])

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0')
