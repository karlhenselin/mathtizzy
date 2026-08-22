package com.petraguardsoftware.mathtizzy;

import android.content.pm.PackageManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AppVersion")
public class AppVersionPlugin extends Plugin {

    @PluginMethod
    public void getVersionName(PluginCall call) {
        JSObject ret = new JSObject();
        String versionName = "";
        try {
            versionName = getContext()
                .getPackageManager()
                .getPackageInfo(getContext().getPackageName(), 0)
                .versionName;
        } catch (PackageManager.NameNotFoundException ignored) {}
        ret.put("versionName", versionName != null ? versionName : "");
        call.resolve(ret);
    }
}
