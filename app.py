from flask import Flask, render_template, request, jsonify
from datetime import datetime

app = Flask(__name__)

# 模拟数据库
posts = []
post_counter = 1

@app.route('/')
def index():
    page = int(request.args.get('page', 1))
    per_page = 5
    start = (page - 1) * per_page
    end = start + per_page
    has_next = len(posts) > end
    data = {
        'posts': posts[start:end],
        'pagination': {'has_next': has_next, 'next_num': page + 1},
        'visit_count': len(posts)
    }
    if request.args.get('ajax') == '1':
        return jsonify({
            'posts': posts[start:end],
            'has_next': has_next,
            'next_page': page + 1
        })
    return render_template('index.html', **data)

@app.route('/add', methods=['POST'])
def add_post():
    global post_counter
    content = request.json.get('content', '')
    if not content:
        return jsonify({'error': 'Empty content'}), 400
    post = {
        'id': post_counter,
        'number': post_counter,
        'content': content,
        'likes': 0,
        'comments': [],
        'comments_count': 0,
        'created_at': datetime.utcnow().isoformat()
    }
    posts.insert(0, post)
    post_counter += 1
    return jsonify(post)

@app.route('/like/<int:post_id>', methods=['POST'])
def like_post(post_id):
    for p in posts:
        if p['id'] == post_id:
            p['likes'] += 1
            return jsonify({'success': True, 'likes': p['likes']})
    return jsonify({'success': False, 'message': 'Post not found'})

@app.route('/comment/<int:post_id>', methods=['GET', 'POST'])
def comment(post_id):
    for p in posts:
        if p['id'] == post_id:
            if request.method == 'POST':
                comment = request.json.get('comment', '')
                if comment:
                    c = {'content': comment, 'created_at': datetime.utcnow().isoformat()}
                    p['comments'].append(c)
                    p['comments_count'] = len(p['comments'])
                    return jsonify({'comment': comment})
                return jsonify({'error': 'Empty comment'}), 400
            else:
                return jsonify(p['comments'])
    return jsonify([])

if __name__ == '__main__':
    app.run(debug=True)
