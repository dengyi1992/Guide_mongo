var crypto = require('crypto'),
    Post = require('../models/post.js'),
    Comment = require('../models/comment.js'),
    User = require('../models/user.js');
var express = require('express');
var router = express.Router();
var multipart = require('connect-multiparty');
var multipartMiddleware = multipart();
/* GET home page. */
router.get('/', function (req, res) {
    //判断是否是第一页，并把请求的页数转换成 number 类型
    var page = parseInt(req.query.p) || 1;
    //查询并返回第 page 页的 10 篇文章
    Post.getTen(null, page, function (err, posts, total) {
        if (err) {
            posts = [];
        }
        res.render('index', {
            title: '主页',
            posts: posts,
            page: page,
            isFirstPage: (page - 1) == 0,
            isLastPage: ((page - 1) * 10 + posts.length) == total,
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        });
    });
});
router.get('/reg', checkNotLogin);
router.get('/reg', function (req, res) {
    res.render('reg', {
        title: '注册',
        user: req.session.user,
        success: req.flash('success').toString(),
        error: req.flash('error').toString()
    });
});
// router.post('/reg', checkNotLogin);
router.post('/reg', function (req, res) {
    var name = req.body.name,
        password = req.body.password,
        password_re = req.body['password-repeat'];
    //检验用户两次输入的密码是否一致
    if (password_re != password) {
        return res.json({'error': '两次输入的密码不一致!'});
    }
    //生成密码的 md5 值
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    var newUser = new User({
        name: name,
        password: password,
        email: req.body.email,
        user_collection: ""
    });
    //检查用户名是否已经存在
    User.get(newUser.name, function (err, user) {
        if (err) {
            return res.json({'error': err});
        }
        if (user) {
            return res.json({'error': '用户已存在!'});
        }
        //如果不存在则新增用户
        newUser.save(function (err, user) {
            if (err) {
                res.json({'error': err});
            }
            req.session.user = newUser;//用户信息存入 session
            res.json({'success': '注册成功!'});
        });
    });
});
// router.get('/login', checkNotLogin);
// // router.get('/login', function (req, res) {
// //     res.render('login', {
// //         title: '登录',
// //         user: req.session.user,
// //         success: req.flash('success').toString(),
// //         error: req.flash('error').toString()
//     });
// });
router.post('/login', checkNotLogin);
router.post('/login', function (req, res) {
    //生成密码的 md5 值
    var md5 = crypto.createHash('md5'),
        password = md5.update(req.body.password).digest('hex');
    //检查用户是否存在
    User.get(req.body.name, function (err, user) {
        if (!user) {
            return res.json({'error': '用户不存在!'});
        }
        //检查密码是否一致
        if (user.password != password) {
            return res.json({'error': '密码错误!'});
        }
        //用户名密码都匹配后，将用户信息存入 session
        req.session.user = user;
        res.json({'success': '登陆成功!','coll':user.user_collection});
    });
});

router.post('/post', checkLogin);
router.post('/post', function (req, res) {
    if (req.body.post == undefined) {
        res.json({'error': '字数过长'});
        return;
    }
    var currentUser = req.session.user,
        tags = [req.body.tag1, req.body.tag2, req.body.tag3],
        post = new Post(currentUser.name, currentUser.head, req.body.title, tags, req.body.post);
    post.save(function (err) {
        if (err) {
            return res.json({'error': err});
        }
        res.json({'success': '发布成功'});
    })
});
router.get('/logout', checkLogin);
router.get('/logout', function (req, res) {
    req.session.user = null;
    res.json({'success': '登出成功!'});
});
/**
 * 文件上传
 * 加入了是否登录检测
 */

router.post('/upload', checkLogin);
router.post('/upload', multipartMiddleware, function (req, res) {
    //已经可以做进一步处理 req.files
    res.json({'success': '文件上传成功!'});
});

/**
 * 搜索
 */
// router.get('/search', function (req, res) {
//     Post.search(req.query.keyword, function (err, posts) {
//         if (err) {
//             req.flash('error', err);
//             return res.redirect('/');
//         }
//         res.render('search', {
//             title: "SEARCH:" + req.query.keyword,
//             posts: posts,
//             user: req.session.user,
//             success: req.flash('success').toString(),
//             error: req.flash('error').toString()
//         });
//     });
// });
// router.get('/links', function (req, res) {
//     res.render('links', {
//         title: '友情链接',
//         user: req.session.user,
//         success: req.flash('success').toString(),
//         error: req.flash('error').toString()
//     });
// });
/**
 * 收藏
 */
router.get('/collection',checkLogin);
router.get('/collection',function (req,res) {
    //检查用户是否存在
    User.get(req.session.user.name, function (err, user) {
        if (!user) {
            return res.json({'error': '用户不存在!'});
        }
        res.json({'success': '查到收藏','coll':user.user_collection});
    });
});
router.post('/collection', checkLogin);
router.post('/collection', function (req, res) {
    User.collection_c(req.session.user.name, req.body.coll, function (err, result) {
        if (err) {
            return res.json({'error': err});
        }
        res.json({'success': '收藏成功'});
    });
});


router.use(function (req, res) {
    res.render("404");
});
function checkLogin(req, res, next) {
    if (!req.session.user) {
        /**
         * 此处要加retrun
         * 不然next（）会继续执行下一条
         */
        return res.json({'error': '未登录!'});
    }
    next();
}

function checkNotLogin(req, res, next) {
    if (req.session.user) {
        return res.json({'error': '已登录!'});
    }
    next();
}

module.exports = router;
