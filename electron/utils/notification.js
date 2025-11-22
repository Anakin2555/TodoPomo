const { Notification } = require('electron')

function systemNotify(title,body,silent=false,closeTime=0){
    const n=new Notification({
        title,body,silent,timeoutType:'never'
    })
    n.show()

    if(closeTime){
        setTimeout(()=>{
            n.close()
        },10000)
    }
    

    return n
}
module.exports={systemNotify}