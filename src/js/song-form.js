{
    let view = {
        el: 'main > .uploadArea',
        init() {
            this.$el = $(this.el)
        },
        template: `
        <div class="dropbox">
            <p id="process"> 点击上传或拖拽文件至此处</p>
            <input type="file" name="uploadfile" id="ulf" onchange="upload()" style="display:none">
        </div>
        <form action="" id="uploadForm" class="uploadForm">
            <label for="Song name">歌曲名称</label>
            <input type="text" name="name" id="" value="__name__">
            <label for="Song name">歌手</label>
            <input type="text" name="singer" id="" value="__singer__">
            <label for="Song name">链接</label>
            <input type="text" name="url" id="" value="__url__">
            <button type="submit">保存</button>
        </form>
        `,
        render(data) {
            let placeholders = ['name', 'singer', 'url', 'id']
            let html = this.template
            placeholders.map((string) => {
                html = html.replace(`__${string}__`, data[string] || '')
            })
            $(this.el).html(html)
        },
        reset() {
            this.render({})
        }
    }

    let model = {
        data: {
            name: '',
            singer: '',
            url: '',
            id: ''
        },
        create(data) {
            var Song = AV.Object.extend('Song');
            var song = new Song();
            song.set('name', data.name);
            song.set('singer', data.singer);
            song.set('url', data.url);
            return song.save().then((newSong) => {
                let {
                    id,
                    attributes
                } = newSong
                Object.assign(this.data, {
                    id,
                    ...attributes,
                })
            }, (error) => {
                console.error(error);
            });
        }
    }

    let controller = {
        init(view, model) {
            this.view = view
            this.model = model
            this.view.init()
            this.view.render(this.model.data)
            this.bindEvents()
            this.bindEventHub()
            this.initQiniu()
        },
        bindEventHub() {
            window.eventHub.on('upload', (data) => {
                this.model.data = data
                this.view.render(this.model.data)
                this.initQiniu()
            })
            window.eventHub.on('select', (data) => {
                this.model.data = data
                this.view.render(this.model.data)
                this.initQiniu()
            })
        },
        updata() {
            let needs = 'name singer url'.split(' ')
            let data = {}
            needs.map((string) => {
                data[string] = this.view.$el.find(`[name="${string}"]`).val()
            })
            let song = AV.Object.createWithoutData('Song', this.model.data.id);
            song.set('name', data.name);
            song.set('singer', data.singer);
            song.set('url', data.url);
            return song.save().then((response)=>{
                Object.assign(this.model.data,data)
                window.eventHub.emit('update', JSON.parse(JSON.stringify(this.model.data)))
                return response
            })
        },
        save() {
            let needs = 'name singer url'.split(' ')
            let data = {}
            needs.map((string) => {
                data[string] = this.view.$el.find(`[name="${string}"]`).val()
            })
            this.model.create(data)
                .then(() => {
                    this.view.reset()
                    window.eventHub.emit('create', JSON.parse(JSON.stringify(this.model.data)))
                })
        },
        bindEvents() {
            this.view.$el.on('submit', 'form', (e) => {
                e.preventDefault()
                if (this.model.data.id) {
                    this.updata()
                } else {
                    this.save()
                }
            })
        },
        initQiniu() {
            let config = {
                useCdnDomain: true,
                region: undefined
            };
            let putExtra = {
                fname: "",
                params: {},
                mimeType: [] || null
            };

            let dropbox = document.querySelector('.dropbox')
            dropbox.addEventListener('dragenter', (e) => {
                e.stopPropagation()
                e.preventDefault()
            })
            dropbox.addEventListener('dragover', (e) => {
                e.stopPropagation()
                e.preventDefault()
            })
            dropbox.addEventListener('drop', (e) => {
                e.stopPropagation()
                e.preventDefault()
                uploadQiniu(e.dataTransfer.files[0])
            })
            dropbox.addEventListener('click', () => {
                ulf.click()
            })

            upload = function () {
                uploadQiniu(ulf.files[0])
            }

            function uploadQiniu(upfile) {
                let file = upfile
                let key = file.name
                let request = new XMLHttpRequest()
                request.open('get', 'http://localhost:8888/uptoken') // 配置request
                request.send()
                request.onreadystatechange = () => {
                    if (request.readyState === 4) {
                        if (request.status >= 200 && request.status < 300) {
                            let string = request.responseText
                            let object = window.JSON.parse(string)
                            console.log('说明请求成功')
                            let token = object.uptoken
                            let observable = qiniu.upload(file, key, token, putExtra, config)
                            let observer = {
                                next(res) {

                                },
                                error(err) {
                                    console.log(err.reqId)
                                    console.log(err.message)
                                },
                                complete(res) {
                                    let retUrl = 'http://pn7ja5zzq.bkt.clouddn.com/' + encodeURIComponent(key)
                                    window.eventHub.emit('upload', {
                                        url: retUrl,
                                        name: key
                                    })
                                }
                            }
                            let subscription = observable.subscribe(observer)
                        } else if (request.status >= 400) {
                            console.log('说明请求失败')
                        }
                    }
                }
            }
        }
    }

    controller.init(view, model)


}