{
    let view = {
        el: 'header',
        template: `
            <div class="logo">网易云音乐</div>
        `,
        render(data){
            $(this.el).html(this.template)
        }
    }

    let model = {}

    let controller = {
        init(view, model){
            this.view = view
            this.model = model
            this.view.render(this.model.data)
        }
    }

    controller.init(view,model)
}