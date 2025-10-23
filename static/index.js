document.addEventListener('DOMContentLoaded', function () {
    // === 🌐 Language system ===
    const userLang = navigator.language.startsWith('zh') ? 'zh' : 'en';

    const LANG = {
        zh: {
            viewComments: '💬 查看评论（{count}）',
            hideComments: '🔽 收起评论',
            commentPlaceholder: '写下你的评论...',
            commentButton: '评论',
            postButton: '发布投稿',
            likeButton: '👍',
            deleteConfirm: '确定删除？',
            deleteButton: '🗑 删除',
            postSuccess: '发布成功！',
            postFail: '发布失败',
            commentFail: '评论提交失败',
            justNow: '刚刚',
            loadMore: '加载更多'
        },
        en: {
            viewComments: '💬 View comments ({count})',
            hideComments: '🔽 Hide comments',
            commentPlaceholder: 'Write a comment...',
            commentButton: 'Comment',
            postButton: 'Post',
            likeButton: '👍',
            deleteConfirm: 'Delete this post?',
            deleteButton: '🗑 Delete',
            postSuccess: 'Posted successfully!',
            postFail: 'Failed to post',
            commentFail: 'Failed to submit comment',
            justNow: 'just now',
            loadMore: 'Load more'
        }
    };
    const T = LANG[userLang];

    // 初始化首屏按钮语言
    const postBtn = document.getElementById('dynamic-post-button');
    if (postBtn) postBtn.textContent = T.postButton;
    document.querySelectorAll('.comment-button').forEach(btn => btn.textContent = T.commentButton);
    document.querySelectorAll('input[name="comment"]').forEach(input => input.placeholder = T.commentPlaceholder);
    const loadMoreBtnInit = document.getElementById('load-more');
    if (loadMoreBtnInit) loadMoreBtnInit.textContent = T.loadMore;

    // === ⏱️ 时间显示 ===
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
        return T.justNow;
    }

    // 初始化时间显示
    document.querySelectorAll('.timestamp').forEach(el => {
        const utcTime = el.getAttribute('data-utc');
        if (utcTime) el.textContent = timeAgo(utcTime);
    });

    // === 🧩 帖子事件绑定 ===
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
                toggleButton.innerHTML = T.hideComments;

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
                toggleButton.innerHTML = T.viewComments.replace('{count}', commentList.querySelectorAll('.comment').length);
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
                div.innerHTML = `💬 ${result.comment}<span class="comment-time">（${T.justNow}）</span>`;
                commentList.appendChild(div);
                input.value = '';
                toggleButton.innerHTML = T.viewComments.replace('{count}', commentList.querySelectorAll('.comment').length);
            } else {
                alert(T.commentFail);
            }
        });

        // 设置语言占位符和按钮文字
        const commentBtn = commentForm.querySelector('.comment-button');
        if (commentBtn) commentBtn.textContent = T.commentButton;
        const commentInput = commentForm.querySelector('input[name="comment"]');
        if (commentInput) commentInput.placeholder = T.commentPlaceholder;
    }

    // 绑定现有帖子事件
    document.querySelectorAll('.post').forEach(bindPostEvents);

    // === 📝 发布投稿 ===
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
                        <button type="button" class="toggle-comments-btn">${T.viewComments.replace('{count}', 0)}</button>
                    </div>
                    <div class="right-actions">
                        <form class="like-form" data-post-id="${result.id}">
                            <button type="submit" class="like-button">${T.likeButton} <span class="like-count">0</span></button>
                        </form>
                    </div>
                </div>
                <div class="comments-section" style="display: none;">
                    <div class="comments" id="comments-${result.id}"></div>
                    <form class="comment-form" data-post-id="${result.id}">
                        <input type="text" name="comment" placeholder="${T.commentPlaceholder}" required>
                        <button type="submit" class="comment-button">${T.commentButton}</button>
                    </form>
                </div>
            </div>`;
            const container = document.querySelector('#posts-container');
            if (container) {
                container.insertAdjacentHTML('afterbegin', postHtml);
                const newPost = container.querySelector(`#post-${result.id}`);
                bindPostEvents(newPost);
            }
            form.reset();
            alert(T.postSuccess);
        } else {
            alert(T.postFail);
        }
    });

    // === ⬇️ 加载更多 ===
    const loadMoreBtn = document.getElementById('load-more');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', async function () {
            const page = loadMoreBtn.dataset.page;
            const response = await fetch(`/?page=${page}&ajax=1`);
            if (response.ok) {
                const data = await response.json();
                data.posts.forEach(post => {
                    const html = `
                    <div class="post" id="post-${post.id}">
                        <p><strong>【${post.number}】</strong>${post.content}</p>
                        <div class="timestamp">${timeAgo(post.created_at)}</div>
                        <div class="action-bar">
                            <div class="left-actions">
                                <button type="button" class="toggle-comments-btn">${T.viewComments.replace('{count}', post.comments_count)}</button>
                            </div>
                            <div class="right-actions">
                                <form class="like-form" data-post-id="${post.id}">
                                    <button type="submit" class="like-button">${T.likeButton} <span class="like-count">${post.likes}</span></button>
                                </form>
                            </div>
                        </div>
                        <div class="comments-section" style="display: none;">
                            <div class="comments" id="comments-${post.id}"></div>
                            <form class="comment-form" data-post-id="${post.id}">
                                <input type="text" name="comment" placeholder="${T.commentPlaceholder}" required>
                                <button type="submit" class="comment-button">${T.commentButton}</button>
                            </form>
                        </div>
                    </div>`;
                    loadMoreBtn.insertAdjacentHTML('beforebegin', html);
                    bindPostEvents(document.getElementById(`post-${post.id}`));
                });

                if (data.has_next) {
                    loadMoreBtn.dataset.page = data.next_page;
                } else {
                    loadMoreBtn.remove();
                }
            }
        });
    }
});
