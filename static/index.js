
document.addEventListener('DOMContentLoaded', function () {
    function timeAgo(date) {
        const seconds = Math.floor((new Date() - new Date(date)) / 1000);
        const intervals = {
            year: 31536000,
            month: 2592000,
            week: 604800,
            day: 86400,
            hour: 3600,
            minute: 60,
            second: 1
        };
        for (const unit in intervals) {
            const interval = Math.floor(seconds / intervals[unit]);
            if (interval >= 1) {
                return interval + ' ' + unit + (interval > 1 ? 's' : '') + ' ago';
            }
        }
        return 'just now';
    }

    document.querySelectorAll('.timestamp').forEach(el => {
        const utcTime = el.getAttribute('data-utc');
        if (utcTime) {
            el.textContent = timeAgo(utcTime);
        }
    });

    function bindPostEvents(postElement) {
        const likeForm = postElement.querySelector('.like-form');
        if (likeForm) {
            likeForm.addEventListener('submit', async function (e) {
                e.preventDefault();
                const postId = likeForm.dataset.postId;
                const response = await fetch(`/like/${postId}`, { method: 'POST' });
                const result = await response.json();
                if (result.success) {
                    likeForm.querySelector('.like-count').textContent = result.likes;
                } else {
                    alert(result.message);
                }
            });
        }

        const toggleButton = postElement.querySelector('.toggle-comments-btn');
        const section = postElement.querySelector('.comments-section');
        const commentList = section.querySelector('.comments');
        const postId = postElement.id ? postElement.id.replace('post-', '') : (likeForm ? likeForm.dataset.postId : '');
        let loaded = false;

        toggleButton.addEventListener('click', async () => {
            const isHidden = section.style.display === 'none' || section.style.display === '';
            if (isHidden) {
                section.style.display = 'block';
                toggleButton.innerHTML = '🔽 收起评论';

                if (!loaded) {
                    const response = await fetch(`/comment/${postId}`);
                    const comments = await response.json();
                    commentList.innerHTML = "";
                    comments.forEach(c => {
                        const div = document.createElement('div');
                        div.className = 'comment';
                        div.innerHTML = `💬 ${c.content}<span class="comment-time">（${c.created_at}）</span>`;
                        commentList.appendChild(div);
                    });
                    loaded = true;
                }
            } else {
                section.style.display = 'none';
                toggleButton.innerHTML = `💬 查看评论（${commentList.querySelectorAll('.comment').length}）`;
            }
        });

        section.style.display = 'none';

        const commentForm = postElement.querySelector('.comment-form');
        commentForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const input = commentForm.querySelector('input[name="comment"]');
            const comment = input.value.trim();
            if (!comment) return;

            const response = await fetch(`/comment/${postId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ comment: comment })
            });

            if (response.ok) {
                const result = await response.json();
                const div = document.createElement('div');
                div.className = 'comment';
                div.innerHTML = `💬 ${result.comment}<span class="comment-time">（刚刚）</span>`;
                commentList.appendChild(div);
                input.value = '';
                toggleButton.innerHTML = `💬 查看评论（${commentList.querySelectorAll('.comment').length}）`;
            } else {
                alert('评论提交失败');
            }
        });
    }

    document.querySelectorAll('.post').forEach(bindPostEvents);

    document.getElementById('post-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        const form = e.target;
        const content = form.querySelector('textarea[name="content"]').value.trim();
        if (!content) return;

        const response = await fetch('/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content })
        });

        if (response.ok) {
            const result = await response.json();
            const postHtml = `
            <div class="post" id="post-${result.id}">
                <p><strong>【${result.number}】</strong>${result.content}</p>
                <div class="timestamp">${timeAgo(result.created_at)}</div>
                <div class="action-bar">
                    <div class="left-actions">
                        <button type="button" class="toggle-comments-btn">💬 查看评论（0）</button>
                    </div>
                    <div class="right-actions">
                        <form class="like-form" data-post-id="${result.id}">
                            <button type="submit" class="like-button">👍 <span class="like-count">0</span></button>
                        </form>
                    </div>
                </div>
                <div class="comments-section" style="display: none;">
                    <div class="comments" id="comments-${result.id}"></div>
                    <form class="comment-form" data-post-id="${result.id}">
                        <input type="text" name="comment" placeholder="写下你的评论..." required>
                        <button type="submit" class="comment-button">评论</button>
                    </form>
                </div>
            </div>`;
            const container = document.querySelector('.posts-container');
            if (container) {
                container.insertAdjacentHTML('afterbegin', postHtml);
                const newPost = container.querySelector(`#post-${result.id}`);
                bindPostEvents(newPost);
            }
            form.reset();
        } else {
            alert('发布失败');
        }
    });
});
