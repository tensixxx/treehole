from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
from sqlalchemy import text

app = Flask(__name__)

# === Railway PostgreSQL 连接配置 ===
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql://postgres:oRGFlMqTEqKgbOMtZeSYqXHgpjUCsWJN@shinkansen.proxy.rlwy.net:20191/railway'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)

# === 数据表定义 ===
class Post(db.Model):
    __tablename__ = 'post'
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime)
    likes = db.Column(db.Integer, default=0)
    user_ip = db.Column(db.String(50))

class Comment(db.Model):
    __tablename__ = 'comment'
    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'))
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime)

# === 初始化：仅当表不存在时创建 ===
with app.app_context():
    db.engine.execute(text("""
    CREATE TABLE IF NOT EXISTS post (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        likes INTEGER DEFAULT 0,
        user_ip VARCHAR(50)
    );
    """))
    db.engine.execute(text("""
    CREATE TABLE IF NOT EXISTS comment (
        id SERIAL PRIMARY KEY,
        post_id INTEGER REFERENCES post(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """))

# === 首页 ===
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
            'number': post.id,
            'content': post.content,
            'likes': post.likes,
            'created_at': post.created_at.isoformat() if post.created_at else '',
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

    user_ip = request.remote_addr or 'unknown'
    new_post = Post(content=content, user_ip=user_ip, created_at=datetime.utcnow())
    db.session.add(new_post)
    db.session.commit()

    return jsonify({
        'id': new_post.id,
        'number': new_post.id,
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
    post.likes = (post.likes or 0) + 1
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
        new_comment = Comment(post_id=post.id, content=content, created_at=datetime.utcnow())
        db.session.add(new_comment)
        db.session.commit()
        return jsonify({'comment': content})
    else:
        comments = Comment.query.filter_by(post_id=post.id).order_by(Comment.id.asc()).all()
        return jsonify([
            {
                'content': c.content,
                'created_at': c.created_at.strftime('%Y-%m-%d %H:%M:%S') if c.created_at else ''
            } for c in comments
        ])

# === 错误处理 ===
@app.errorhandler(Exception)
def handle_error(e):
    print(f"❌ Error: {e}")
    return jsonify({'error': str(e)}), 500

# === 启动服务器 ===
if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
