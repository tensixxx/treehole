document.addEventListener('DOMContentLoaded', function () {
    // 本地时间转换
    document.querySelectorAll('.timestamp').forEach(el => {
        const utcTime = el.getAttribute('data-utc');
        if (utcTime) {
            const localTime = new Date(utcTime).toLocaleString();
            el.textContent = localTime;
        }
    });

    // ====== 核心：为每个 post 绑定交互功能 ======
    function bindPostEvents(postElement) {
        // 点赞按钮 AJAX
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

        // 折叠评论 + 懒加载评论内容
        const toggleButton = postElement.querySelector('.toggle-comments-btn');
        const section = postElement.querySelector('.comments-section');
        const commentList = section.querySelector('.comments');
        const postId = postElement.id ? postElement.id.replace('post-', '') : (likeForm ? likeForm.dataset.postId : '');
        let loaded = false; // 是否已加载评论

        // 初始化评论按钮
        const count = commentList.querySelectorAll('.comment').length;
        toggleButton.innerHTML = `💬 查看评论（${count}）`;

        toggleButton.addEventListener('click', async () => {
            const isHidden = section.style.display === 'none' || section.style.display === '';
            if (isHidden) {
                section.style.display = 'block';
                toggleButton.innerHTML = '🔽 收起评论';

                // 懒加载评论
                if (!loaded) {
                    const response = await fetch(`/comment/${postId}`);
                    const comments = await response.json();
                    commentList.innerHTML = ""; // 清空（避免重复加载）
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
                const count = commentList.querySelectorAll('.comment').length;
                toggleButton.innerHTML = `💬 查看评论（${count}）`;
            }
        });

        section.style.display = 'none';

        // 评论表单 AJAX 提交
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

                // 更新评论按钮数量
                const count = commentList.querySelectorAll('.comment').length;
                toggleButton.innerHTML = section.style.display === 'none'
                    ? `💬 查看评论（${count}）`
                    : '🔽 收起评论';
            } else {
                alert('评论提交失败');
            }
        });
    }

    // ========== 现有所有 post 元素都绑定功能 ==========
    document.querySelectorAll('.post').forEach(bindPostEvents);

    // ========== AJAX 投稿 ==========
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
                <div class="timestamp">${result.created_at}</div>
                <div class="action-bar">
                    <div class="left-actions">
                        <button type="button" class="toggle-comments-btn">💬 查看评论（0）</button>
                    </div>
                    <div class="right-actions">
                        <form class="like-form" data-post-id="${result.id}">
                            <button type="submit" class="like-button">
                                👍 <span class="like-count">0</span>
                            </button>
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
            </div>
            `;
            // 插入最前面
            const firstPost = document.querySelector('.post');
            if (firstPost) {
                firstPost.insertAdjacentHTML('beforebegin', postHtml);
                // 绑定新帖子功能
                const newPost = firstPost.previousElementSibling;
                bindPostEvents(newPost);
            } else {
                // 没有帖子时插入到列表容器
                document.querySelector('.posts-container').insertAdjacentHTML('afterbegin', postHtml);
                const newPost = document.querySelector('.post');
                bindPostEvents(newPost);
            }
            form.reset();
        } else {
            alert('发布失败');
        }
    });
});
