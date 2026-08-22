package com.petraguardsoftware.mathtizzy;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppVersionPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
